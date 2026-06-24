package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Story
import com.github.shk0da.bioritmic.api.domain.StoryView
import com.github.shk0da.bioritmic.api.repository.StoryRepository
import com.github.shk0da.bioritmic.api.repository.StoryViewBatchRepository
import com.github.shk0da.bioritmic.api.repository.StoryViewRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.concurrent.TimeUnit

@Service
class StoryService(
    private val storyRepository: StoryRepository,
    private val storyViewRepository: StoryViewRepository,
    private val storyViewBatchRepository: StoryViewBatchRepository
) {

    companion object {
        private const val STORY_EXPIRY_HOURS = 24L
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun createStory(userId: Long, mediaUrl: String, caption: String?): Story {
        val story = Story()
        story.userId = userId
        story.mediaUrl = mediaUrl
        story.caption = caption
        story.expiresAt = Timestamp(System.currentTimeMillis() + TimeUnit.HOURS.toMillis(STORY_EXPIRY_HOURS))
        story.createdAt = Timestamp(System.currentTimeMillis())

        return storyRepository.save(story)
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun getFeed(currentUserId: Long): List<Map<String, Any?>> {
        val stories = storyRepository.findAllActive()
        if (stories.isEmpty()) return emptyList()

        val storyIds = stories.mapNotNull { it.id }

        val viewerCounts = storyViewBatchRepository.countViewersByStoryIds(storyIds)
        val viewedByUser = storyViewBatchRepository.existsByStoryIdsAndViewerId(storyIds, currentUserId)

        return stories.map { story ->
            mapOf(
                "id" to story.id,
                "userId" to story.userId,
                "mediaUrl" to story.mediaUrl,
                "caption" to story.caption,
                "expiresAt" to story.expiresAt?.time,
                "createdAt" to story.createdAt?.time,
                "viewerCount" to (viewerCounts[story.id] ?: 0),
                "viewedByCurrentUser" to (story.id in viewedByUser)
            )
        }
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun viewStory(storyId: Long, viewerId: Long) {
        val existing = storyViewRepository.findByStoryIdAndViewerId(storyId, viewerId)
        if (existing == null) {
            val storyView = StoryView()
            storyView.storyId = storyId
            storyView.viewerId = viewerId
            storyView.viewedAt = Timestamp(System.currentTimeMillis())
            storyViewRepository.save(storyView)
        }
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun deleteExpiredStories() {
        storyRepository.deleteExpired(Timestamp(System.currentTimeMillis()))
    }
}
