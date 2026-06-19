package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Story
import com.github.shk0da.bioritmic.api.domain.StoryView
import com.github.shk0da.bioritmic.api.repository.StoryRepository
import com.github.shk0da.bioritmic.api.repository.StoryViewRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.concurrent.TimeUnit

@Service
class StoryService(
    val storyRepository: StoryRepository,
    val storyViewRepository: StoryViewRepository,
    val s3Service: S3Service
) {

    private val log = LoggerFactory.getLogger(StoryService::class.java)

    @Transactional(transactionManager = transactionManager)
    suspend fun createStory(userId: Long, mediaUrl: String, caption: String?): Story {
        val story = Story()
        story.userId = userId
        story.mediaUrl = mediaUrl
        story.caption = caption
        story.expiresAt = Timestamp(System.currentTimeMillis() + TimeUnit.HOURS.toMillis(24))
        story.createdAt = Timestamp(System.currentTimeMillis())

        return storyRepository.save(story)
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun getFeed(currentUserId: Long): List<Map<String, Any?>> {
        val stories = storyRepository.findAllActive()
        return stories.map { story ->
            val viewerCount = storyViewRepository.countViewersByStoryId(story.id!!)
            val viewedByCurrentUser = storyViewRepository.existsByStoryIdAndViewerId(story.id!!, currentUserId)
            mapOf(
                "id" to story.id,
                "userId" to story.userId,
                "mediaUrl" to story.mediaUrl,
                "caption" to story.caption,
                "expiresAt" to story.expiresAt?.time,
                "createdAt" to story.createdAt?.time,
                "viewerCount" to viewerCount,
                "viewedByCurrentUser" to viewedByCurrentUser
            )
        }
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun viewStory(storyId: Long, viewerId: Long) {
        val alreadyViewed = storyViewRepository.existsByStoryIdAndViewerId(storyId, viewerId)
        if (!alreadyViewed) {
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
