package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Story
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.repository.BookmarkRepository
import com.github.shk0da.bioritmic.api.repository.StoryReactionBatchRepository
import com.github.shk0da.bioritmic.api.repository.StoryReactionRepository
import com.github.shk0da.bioritmic.api.repository.StoryRepository
import com.github.shk0da.bioritmic.api.repository.StoryViewBatchRepository
import com.github.shk0da.bioritmic.api.repository.StoryViewRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.model.story.StoryReactionType
import com.github.shk0da.bioritmic.api.utils.ImageUtils
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
import java.util.concurrent.TimeUnit
import javax.imageio.ImageIO

@Service
class StoryService(

    private val storyRepository: StoryRepository,
    private val bookmarkRepository: BookmarkRepository,
    private val storyViewRepository: StoryViewRepository,
    private val storyViewBatchRepository: StoryViewBatchRepository,
    private val storyReactionRepository: StoryReactionRepository,
    private val storyReactionBatchRepository: StoryReactionBatchRepository,
    private val s3Service: S3Service,
    private val userRepository: UserRepository
) {

    companion object {
        private const val STORY_EXPIRY_HOURS = 24L
        private const val STORY_UNLOCK_EXTEND_HOURS = 12L
        private const val FEED_STORY_LIMIT = 200
        private const val MAX_CAPTION_LENGTH = 500
        private const val MAX_STORY_IMAGE_BYTES = 5 * 1024 * 1024
        private const val CONTENT_TYPE_JPEG = "image/jpeg"
        private val ALLOWED_EXTENSIONS = listOf("png", "jpg", "jpeg", "webp")
    }

    private val log = LoggerFactory.getLogger(StoryService::class.java)

    @Transactional(transactionManager = transactionManager)
    suspend fun createStory(userId: UUID, file: FilePart, caption: String?): Story {
        requireVerifiedUser(userId)

        checkNotEmpty(file.filename(), ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
        checkFileExtension(
            file.filename(),
            ALLOWED_EXTENSIONS,
            ErrorCode.INVALID_PARAMETER,
            mapOf("file" to "file")
        )

        val bytes = readFileBytes(file)
        checkSize(bytes.size, MAX_STORY_IMAGE_BYTES, ErrorCode.INVALID_PARAMETER)
        validateImageBytes(bytes)

        val imageBytes = ImageUtils.cropImageBytes(bytes, ImageUtils.ImageTag.CROPP_500x500)
        val s3Key = "stories/$userId/${UUID.randomUUID()}.jpg"

        s3Service.uploadPhoto(s3Key, imageBytes, CONTENT_TYPE_JPEG)

        val story = Story().apply {
            this.userId = userId
            this.mediaUrl = s3Service.getPhotoUrl(s3Key)
            this.caption = caption?.trim()?.takeIf { it.isNotEmpty() }?.take(MAX_CAPTION_LENGTH)
            this.expiresAt = Timestamp(System.currentTimeMillis() + TimeUnit.HOURS.toMillis(STORY_EXPIRY_HOURS))
            this.createdAt = Timestamp(System.currentTimeMillis())
            this.locked = false
        }

        return try {
            storyRepository.save(story)
        } catch (ex: Exception) {
            s3Service.deletePhoto(s3Key)
            throw ex
        }
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun getFeed(currentUserId: UUID): List<Map<String, Any?>> {
        val stories = storyRepository.findActiveBookmarkedByViewer(currentUserId, FEED_STORY_LIMIT)
        if (stories.isEmpty()) return emptyList()

        val storyIds = stories.mapNotNull { it.id }

        val viewerCounts = storyViewBatchRepository.countViewersByStoryIds(storyIds)
        val viewedByUser = storyViewBatchRepository.existsByStoryIdsAndViewerId(storyIds, currentUserId)
        val reactionsByUser = storyReactionBatchRepository.findReactionsByStoryIdsAndViewerId(storyIds, currentUserId)
        val reactionCounts = storyReactionBatchRepository.countReactionsByStoryIds(storyIds)

        return stories.map { story ->
            mapOf(
                "id" to story.id,
                "userId" to story.userId,
                "mediaUrl" to story.mediaUrl,
                "caption" to story.caption,
                "expiresAt" to story.expiresAt?.time,
                "createdAt" to story.createdAt?.time,
                "locked" to story.locked,
                "viewerCount" to (viewerCounts[story.id] ?: 0),
                "viewedByCurrentUser" to (story.id in viewedByUser),
                "currentUserReaction" to reactionsByUser[story.id],
                "reactionCounts" to (reactionCounts[story.id] ?: emptyMap<String, Int>())
            )
        }
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun viewStory(storyId: Long, viewerId: UUID) {
        val story = storyRepository.findById(storyId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        val authorId = story.userId
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        if (authorId != viewerId && !bookmarkRepository.existsByUserIdAndOtherUserId(viewerId, authorId)) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        storyViewRepository.recordView(storyId, viewerId)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun reactToStory(storyId: Long, viewerId: UUID, reaction: String): Map<String, Any?> {
        val story = storyRepository.findById(storyId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        val authorId = story.userId
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        if (authorId != viewerId && !bookmarkRepository.existsByUserIdAndOtherUserId(viewerId, authorId)) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        val reactionType = StoryReactionType.parse(reaction)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("reaction" to "reaction"))
        val existingReaction = storyReactionRepository.findReactionByStoryIdAndViewerId(storyId, viewerId)
        if (existingReaction == reactionType.name) {
            storyReactionRepository.deleteByStoryIdAndViewerId(storyId, viewerId)
            val counts = storyReactionBatchRepository.countReactionsByStoryIds(listOf(storyId))[storyId]
                ?: emptyMap()
            return mapOf(
                "reaction" to null,
                "reactionCounts" to counts
            )
        }
        storyReactionRepository.upsert(storyId, viewerId, reactionType.name)
        val counts = storyReactionBatchRepository.countReactionsByStoryIds(listOf(storyId))[storyId]
            ?: emptyMap()
        return mapOf(
            "reaction" to reactionType.name,
            "reactionCounts" to counts
        )
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun deleteStory(storyId: Long, currentUserId: UUID) {
        val story = storyRepository.findById(storyId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        val authorId = story.userId
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        if (authorId != currentUserId) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }

        storyReactionRepository.deleteByStoryId(storyId)
        storyViewRepository.deleteByStoryId(storyId)
        storyRepository.deleteById(storyId)

        S3Service.keyFromPhotoUrl(story.mediaUrl)?.let { s3Service.deletePhoto(it) }
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun setStoryLocked(storyId: Long, currentUserId: UUID, locked: Boolean): Map<String, Any?> {
        val story = storyRepository.findById(storyId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        val authorId = story.userId
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Story not found"))
        if (authorId != currentUserId) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }

        story.locked = locked
        if (!locked) {
            story.expiresAt = Timestamp(
                System.currentTimeMillis() + TimeUnit.HOURS.toMillis(STORY_UNLOCK_EXTEND_HOURS)
            )
        }

        val saved = storyRepository.save(story)
        return mapOf(
            "id" to saved.id,
            "locked" to saved.locked,
            "expiresAt" to saved.expiresAt?.time
        )
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun deleteExpiredStories() {
        val now = Timestamp(System.currentTimeMillis())
        val expiredStories = storyRepository.findExpiredBefore(now)
        expiredStories.forEach { story ->
            S3Service.keyFromPhotoUrl(story.mediaUrl)?.let { s3Service.deletePhoto(it) }
        }
        storyRepository.deleteExpired(now)
    }

    private suspend fun readFileBytes(file: FilePart): ByteArray = withContext(Dispatchers.IO) {
        try {
            val dataBuffer = file.content().reduce { a, b -> a.write(b) }.awaitSingle()
            val bytes = ByteArray(dataBuffer.readableByteCount())
            dataBuffer.read(bytes)
            bytes
        } catch (ex: IOException) {
            log.warn("Failed to read story image: {}", ex.message)
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
        }
    }

    private fun validateImageBytes(bytes: ByteArray) {
        try {
            val image = ImageIO.read(ByteArrayInputStream(bytes))
            if (image == null) {
                throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
            }
        } catch (ex: IOException) {
            log.warn("Invalid story image: {}", ex.message)
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
        }
    }

    private suspend fun requireVerifiedUser(userId: UUID) {
        val user = userRepository.findById(userId)
            ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        if (!user.isVerified) {
            throw ApiException(ErrorCode.USER_NOT_VERIFIED)
        }
    }
}
