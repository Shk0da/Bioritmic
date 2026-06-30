package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.repository.FeedbackRepository
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.StoryRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class S3MediaAccessService(
    private val storyRepository: StoryRepository,
    private val mailboxRepository: MailboxRepository,
    private val feedbackRepository: FeedbackRepository,
    private val userRoleRepository: UserRoleRepository,
) {

    suspend fun canAccessMedia(userId: UUID, s3Key: String): Boolean {
        val normalizedKey = s3Key.trim().trimStart('/')
        if (normalizedKey.isBlank() || normalizedKey.contains("..")) {
            return false
        }
        return when {
            normalizedKey.startsWith(PROFILE_PREFIX) -> canAccessProfile(userId, normalizedKey)
            normalizedKey.startsWith(STORIES_PREFIX) -> storyRepository.canViewerAccessStoryMedia(userId, normalizedKey) > 0
            normalizedKey.startsWith(MAILBOX_PREFIX) -> mailboxRepository.countByMediaS3KeyForParticipant(normalizedKey, userId) > 0
            normalizedKey.startsWith(FEEDBACK_PREFIX) -> canAccessFeedback(userId, normalizedKey)
            else -> false
        }
    }

    private fun canAccessProfile(userId: UUID, s3Key: String): Boolean {
        val ownerId = s3Key.removePrefix(PROFILE_PREFIX).substringBefore('/')
        return ownerId == userId.toString()
    }

    private suspend fun canAccessFeedback(userId: UUID, s3Key: String): Boolean {
        val feedback = feedbackRepository.findByAttachmentS3Key(s3Key) ?: return false
        if (feedback.userId == userId) {
            return true
        }
        return userRoleRepository.findByUserIdAndRole(userId, ROLE_ADMIN) != null ||
            userRoleRepository.findByUserIdAndRole(userId, LEGACY_ADMIN_ROLE) != null
    }

    companion object {
        private const val PROFILE_PREFIX = "profile/"
        private const val STORIES_PREFIX = "stories/"
        private const val MAILBOX_PREFIX = "mailbox/"
        private const val FEEDBACK_PREFIX = "feedback/"
        private const val LEGACY_ADMIN_ROLE = "ADMIN"
    }
}
