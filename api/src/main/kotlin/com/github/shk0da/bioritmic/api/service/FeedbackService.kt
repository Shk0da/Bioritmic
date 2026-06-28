package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.FeedbackStatus
import com.github.shk0da.bioritmic.api.domain.FeedbackTopic
import com.github.shk0da.bioritmic.api.domain.UserFeedback
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.repository.FeedbackRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkFileExtension
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkNotEmpty
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.reactive.awaitSingle
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.http.codec.multipart.FilePart
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.ByteArrayInputStream
import java.io.IOException
import java.sql.Timestamp
import java.util.UUID
import javax.imageio.ImageIO

@Service
class FeedbackService(
    private val feedbackRepository: FeedbackRepository,
    private val s3Service: S3Service
) {

    private val log = LoggerFactory.getLogger(FeedbackService::class.java)

    companion object {
        private const val MAX_MESSAGE_LENGTH = 4000
        private const val MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
        private val ALLOWED_EXTENSIONS = listOf("png", "jpg", "jpeg", "gif", "webp")
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun createFeedback(userId: UUID, topic: String, message: String, file: FilePart?): UserFeedback {
        validateTopic(topic)
        validateMessage(message)

        val feedback = UserFeedback().apply {
            this.userId = userId
            this.topic = topic
            this.message = message.trim()
            this.status = FeedbackStatus.NEW
            this.createdAt = Timestamp(System.currentTimeMillis())
        }

        val saved = feedbackRepository.save(feedback)

        if (file != null) {
            try {
                uploadAttachment(saved, file)
            } catch (ex: Exception) {
                feedbackRepository.delete(saved)
                throw ex
            }
        }

        log.info("Feedback created: id={}, userId={}, topic={}", saved.id, userId, topic)
        return saved
    }

    suspend fun listForAdmin(status: String?, page: Int, size: Int): PaginatedFeedback {
        val safePage = page.coerceAtLeast(0)
        val pageSize = size.coerceIn(1, 100)
        val offset = safePage.toLong() * pageSize
        val items = if (status.isNullOrBlank()) {
            feedbackRepository.findAllPaginated(pageSize, offset)
        } else {
            if (status !in FeedbackStatus.ALL) {
                throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Invalid status: $status"))
            }
            feedbackRepository.findByStatusPaginated(status, pageSize, offset)
        }
        val total = if (status.isNullOrBlank()) {
            feedbackRepository.countAll()
        } else {
            feedbackRepository.countByStatus(status)
        }
        return PaginatedFeedback(items = items, total = total, page = safePage, size = pageSize)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun updateStatus(feedbackId: Long, status: String): UserFeedback {
        if (status !in FeedbackStatus.ALL) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Invalid status: $status"))
        }
        val feedback = feedbackRepository.findById(feedbackId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Feedback not found"))
        feedbackRepository.updateStatus(feedbackId, status)
        feedback.status = status
        return feedback
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun deleteFeedback(feedbackId: Long) {
        val feedback = feedbackRepository.findById(feedbackId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Feedback not found"))
        feedback.attachmentS3Key?.let { s3Service.deletePhoto(it) }
        feedbackRepository.delete(feedback)
        log.info("Feedback deleted: id={}", feedbackId)
    }

    suspend fun countNew(): Long = feedbackRepository.countNew()

    private suspend fun uploadAttachment(feedback: UserFeedback, file: FilePart) {
        checkNotEmpty(file.filename(), ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
        checkFileExtension(
            file.filename(),
            ALLOWED_EXTENSIONS,
            ErrorCode.INVALID_PARAMETER,
            mapOf("file" to "file")
        )

        val bytes = readFileBytes(file)
        checkSize(bytes.size, MAX_ATTACHMENT_BYTES, ErrorCode.INVALID_PARAMETER)
        validateImageBytes(bytes)

        val extension = file.filename()!!.substringAfterLast('.').lowercase()
        val contentType = contentTypeForExtension(extension)
        val safeName = file.filename()!!.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val s3Key = "feedback/${feedback.id}/${UUID.randomUUID()}_$safeName"

        s3Service.uploadPhoto(s3Key, bytes, contentType)

        try {
            feedback.attachmentS3Key = s3Key
            feedback.attachmentFilename = file.filename()
            feedback.attachmentContentType = contentType
            feedbackRepository.save(feedback)
        } catch (ex: Exception) {
            s3Service.deletePhoto(s3Key)
            throw ex
        }
    }

    private suspend fun readFileBytes(file: FilePart): ByteArray = withContext(Dispatchers.IO) {
        try {
            val dataBuffer = file.content().reduce { a, b -> a.write(b) }.awaitSingle()
            val bytes = ByteArray(dataBuffer.readableByteCount())
            dataBuffer.read(bytes)
            bytes
        } catch (ex: IOException) {
            log.error("Failed to read feedback attachment: {}", ex.message, ex)
            throw ApiException(ErrorCode.API_INTERNAL_ERROR)
        }
    }

    private fun validateTopic(topic: String) {
        if (topic !in FeedbackTopic.ALL) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Invalid topic: $topic"))
        }
    }

    private fun validateMessage(message: String) {
        val trimmed = message.trim()
        if (trimmed.isEmpty() || trimmed.length > MAX_MESSAGE_LENGTH) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER,
                mapOf("error" to "Message length must be between 1 and $MAX_MESSAGE_LENGTH")
            )
        }
    }

    private fun validateImageBytes(bytes: ByteArray) {
        try {
            val image = ImageIO.read(ByteArrayInputStream(bytes))
            if (image == null) {
                throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
            }
        } catch (ex: IOException) {
            log.warn("Invalid feedback attachment image: {}", ex.message)
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
        }
    }

    private fun contentTypeForExtension(extension: String): String = when (extension.lowercase()) {
        "png" -> "image/png"
        "jpg", "jpeg" -> "image/jpeg"
        "gif" -> "image/gif"
        "webp" -> "image/webp"
        else -> throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
    }
}

data class PaginatedFeedback(
    val items: List<UserFeedback>,
    val total: Long,
    val page: Int,
    val size: Int
)
