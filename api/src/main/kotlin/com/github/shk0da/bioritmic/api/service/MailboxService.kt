package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.mailbox.MailReactionType
import com.github.shk0da.bioritmic.api.model.mailbox.MailMediaType
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.repository.MailboxReactionBatchRepository
import com.github.shk0da.bioritmic.api.repository.MailboxReactionRepository
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.UserBlockRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkFileExtension
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkNotEmpty
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.reactive.awaitSingle
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.domain.Sort.by
import org.springframework.http.codec.multipart.FilePart
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class MailboxService(
    val userService: UserService,
    val mailboxRepository: MailboxRepository,
    val mailboxReactionRepository: MailboxReactionRepository,
    val mailboxReactionBatchRepository: MailboxReactionBatchRepository,
    val userBlockRepository: UserBlockRepository,
    private val pushNotificationService: PushNotificationService,
    private val s3Service: S3Service
) {

    private val log = LoggerFactory.getLogger(MailboxService::class.java)

    private val defaultPageable = PageableRequest(1, 10, by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun getUserMailbox(userId: UUID, pageable: Pageable): List<UserMail> {
        return mailboxRepository.findAllMailsByUserId(userId, pageable.pageSize, pageable.offset)
    }

    @Transactional
    suspend fun sendUserMail(userId: UUID, userMailModel: UserMailModel): List<UserMailModel> {
        val toUserId = userMailModel.to!!
        ensureNotBlocked(userId, toUserId)
        val replyToMessageId = validateReplyTarget(userId, toUserId, userMailModel.replyToMessageId)
        if (userMailModel.message.isNullOrBlank()) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("message" to "message"))
        }

        userMailModel.from = userId
        val userMailWithReply = userMailModel.copy(replyToMessageId = replyToMessageId)
        val userMail = UserMail.of(userMailWithReply)
        mailboxRepository.save(userMail)

        notifyRecipient(userMail, userId)
        return conversationModels(userMail.fromUserId!!, userMail.toUserId!!)
    }

    @Transactional
    suspend fun sendMediaMail(
        userId: UUID,
        toUserId: UUID,
        mediaTypeRaw: String,
        file: FilePart,
        caption: String?,
        replyToMessageId: Long?
    ): List<UserMailModel> {
        ensureNotBlocked(userId, toUserId)
        val validatedReplyId = validateReplyTarget(userId, toUserId, replyToMessageId)

        val mediaType = MailMediaType.parse(mediaTypeRaw)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("mediaType" to "mediaType"))

        val filename = file.filename()
        checkNotEmpty(filename, ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))

        val bytes = readFileBytes(file)
        if (bytes.isEmpty()) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
        }
        val extension = resolveExtension(filename, mediaType)
        checkFileExtension(filename, allowedExtensions(mediaType), ErrorCode.BAD_PHOTO, mapOf("file" to "file"))
        checkSize(bytes.size, maxBytes(mediaType), ErrorCode.INVALID_PARAMETER)

        val contentType = contentTypeFor(extension, mediaType)
        val folder = mediaFolder(mediaType)
        val s3Key = "mailbox/$folder/$userId/$toUserId/${UUID.randomUUID()}.$extension"

        try {
            s3Service.uploadPhoto(s3Key, bytes, contentType)
        } catch (ex: Exception) {
            log.error("Failed to upload mailbox media to S3", ex)
            throw ApiException(ErrorCode.API_SERVICE_UNAVAILABLE)
        }

        val userMail = UserMail.createMedia(
            fromUserId = userId,
            toUserId = toUserId,
            mediaType = mediaType.name,
            mediaS3Key = s3Key,
            caption = caption,
            replyToMessageId = validatedReplyId
        )

        return try {
            mailboxRepository.save(userMail)
            notifyRecipient(userMail, userId)
            conversationModels(userId, toUserId)
        } catch (ex: Exception) {
            s3Service.deletePhoto(s3Key)
            throw ex
        }
    }

    @Transactional
    suspend fun deleteMailboxes(currentUserId: UUID, userId: UUID) {
        val messages = mailboxRepository.findAllBetweenUsers(currentUserId, userId)
        messages.mapNotNull { it.mediaS3Key }.forEach { key ->
            s3Service.deletePhoto(key)
        }
        mailboxRepository.deleteAllMailByBetweenTwoUserId(currentUserId, userId)
    }

    @Transactional(readOnly = true)
    suspend fun getConversation(currentUserId: UUID, otherUserId: UUID): List<UserMail> {
        return mailboxRepository.findConversationBetweenUsers(currentUserId, otherUserId)
    }

    @Transactional(readOnly = true)
    suspend fun getConversationModels(currentUserId: UUID, otherUserId: UUID): List<UserMailModel> {
        val messages = mailboxRepository.findConversationBetweenUsers(currentUserId, otherUserId)
        return toModelsWithReactions(messages, currentUserId)
    }

    @Transactional(readOnly = true)
    suspend fun countUnreadSenders(userId: UUID, sinceMs: Long): Long {
        val since = java.sql.Timestamp(sinceMs)
        return mailboxRepository.countUnreadSenders(userId, since)
    }

    fun toModel(
        userMail: UserMail,
        currentUserReaction: String? = null,
        reactionCounts: Map<String, Int> = emptyMap()
    ): UserMailModel {
        val mediaUrl = userMail.mediaS3Key?.let { s3Service.getPhotoUrl(it) }
        return UserMailModel.of(userMail, mediaUrl, currentUserReaction, reactionCounts)
    }

    private suspend fun conversationModels(fromUserId: UUID, toUserId: UUID): List<UserMailModel> {
        val messages = mailboxRepository.findConversationBetweenUsers(fromUserId, toUserId)
        return toModelsWithReactions(messages, fromUserId)
    }

    private suspend fun toModelsWithReactions(messages: List<UserMail>, currentUserId: UUID): List<UserMailModel> {
        val messageIds = messages.mapNotNull { it.id }
        val reactionsByUser = mailboxReactionBatchRepository.findReactionsByMailIdsAndUserId(messageIds, currentUserId)
        val reactionCounts = mailboxReactionBatchRepository.countReactionsByMailIds(messageIds)
        return messages.map { message ->
            val messageId = message.id
            val currentReaction = if (messageId != null) reactionsByUser[messageId] else null
            val counts = if (messageId != null) reactionCounts[messageId] ?: emptyMap() else emptyMap()
            toModel(message, currentReaction, counts)
        }
    }

    private suspend fun ensureNotBlocked(userId: UUID, otherUserId: UUID) {
        val user = userService.findUserById(otherUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val block = userBlockRepository.findByUserIdAndOtherUserId(user.id!!, userId)
        if (block != null) {
            throw ApiException(ErrorCode.USER_IS_BLOCKED)
        }
    }

    @Transactional(transactionManager = com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager)
    suspend fun reactToMessage(messageId: Long, userId: UUID, reaction: String): Map<String, Any?> {
        val message = mailboxRepository.findById(messageId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("messageId" to "messageId"))
        val from = message.fromUserId ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("messageId" to "messageId"))
        val to = message.toUserId ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("messageId" to "messageId"))
        if (userId != from && userId != to) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }

        val reactionType = MailReactionType.parse(reaction)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("reaction" to "reaction"))
        val existing = mailboxReactionRepository.findReaction(messageId, userId)
        if (existing == reactionType.name) {
            mailboxReactionRepository.deleteReaction(messageId, userId)
            val counts = mailboxReactionBatchRepository.countReactionsByMailIds(listOf(messageId))[messageId] ?: emptyMap()
            return mapOf("reaction" to null, "reactionCounts" to counts)
        }
        mailboxReactionRepository.upsert(messageId, userId, reactionType.name)
        val counts = mailboxReactionBatchRepository.countReactionsByMailIds(listOf(messageId))[messageId] ?: emptyMap()
        return mapOf("reaction" to reactionType.name, "reactionCounts" to counts)
    }

    private suspend fun validateReplyTarget(userId: UUID, otherUserId: UUID, replyToMessageId: Long?): Long? {
        if (replyToMessageId == null) return null
        val targetMessage = mailboxRepository.findById(replyToMessageId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("replyToMessageId" to "replyToMessageId"))
        val from = targetMessage.fromUserId
        val to = targetMessage.toUserId
        val sameConversation = (from == userId && to == otherUserId) || (from == otherUserId && to == userId)
        if (!sameConversation) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("replyToMessageId" to "replyToMessageId"))
        }
        return replyToMessageId
    }

    private suspend fun notifyRecipient(userMail: UserMail, senderId: UUID) {
        val sender = userService.findUserById(senderId)
        val senderName = sender?.name?.takeIf { it.isNotBlank() } ?: "Пользователь"
        val preview = pushPreview(userMail)
        pushNotificationService.notifyNewMessage(userMail.toUserId!!, senderName, preview)
    }

    private fun pushPreview(userMail: UserMail): String {
        if (!userMail.message.isNullOrBlank()) {
            return userMail.message!!
        }
        return when (userMail.mediaType) {
            MailMediaType.VOICE.name -> "Голосовое сообщение"
            MailMediaType.PHOTO.name -> "Фото"
            MailMediaType.VIDEO_NOTE.name -> "Видео-кружок"
            else -> "Новое сообщение"
        }
    }

    private suspend fun readFileBytes(file: FilePart): ByteArray = withContext(Dispatchers.IO) {
        file.content().reduce { buffer1, buffer2 ->
            buffer1.write(buffer2)
            buffer1
        }.awaitSingle().asInputStream().use { it.readAllBytes() }
    }

    private fun allowedExtensions(mediaType: MailMediaType): List<String> = when (mediaType) {
        MailMediaType.VOICE -> listOf("webm", "ogg", "mp4", "m4a")
        MailMediaType.PHOTO -> listOf("png", "jpg", "jpeg", "webp")
        MailMediaType.VIDEO_NOTE -> listOf("webm", "mp4")
    }

    private fun maxBytes(mediaType: MailMediaType): Int = when (mediaType) {
        MailMediaType.VOICE -> MAX_VOICE_BYTES
        MailMediaType.PHOTO -> MAX_PHOTO_BYTES
        MailMediaType.VIDEO_NOTE -> MAX_VIDEO_BYTES
    }

    private fun resolveExtension(filename: String, mediaType: MailMediaType): String {
        val ext = filename.substringAfterLast('.', "").lowercase()
        if (ext.isNotBlank() && allowedExtensions(mediaType).contains(ext)) {
            return ext
        }
        return when (mediaType) {
            MailMediaType.VOICE -> "webm"
            MailMediaType.PHOTO -> "jpg"
            MailMediaType.VIDEO_NOTE -> "webm"
        }
    }

    private fun mediaFolder(mediaType: MailMediaType): String = when (mediaType) {
        MailMediaType.VOICE -> "voice"
        MailMediaType.PHOTO -> "photo"
        MailMediaType.VIDEO_NOTE -> "video"
    }

    private fun contentTypeFor(extension: String, mediaType: MailMediaType): String = when (extension) {
        "png" -> "image/png"
        "webp" -> "image/webp"
        "jpg", "jpeg" -> "image/jpeg"
        "ogg" -> "audio/ogg"
        "m4a" -> "audio/mp4"
        "mp4" -> if (mediaType == MailMediaType.VOICE) "audio/mp4" else "video/mp4"
        else -> if (mediaType == MailMediaType.VOICE) "audio/webm" else "video/webm"
    }

    companion object {
        private const val MAX_VOICE_BYTES = 50 * 1024 * 1024
        private const val MAX_PHOTO_BYTES = 5 * 1024 * 1024
        private const val MAX_VIDEO_BYTES = 50 * 1024 * 1024
    }
}
