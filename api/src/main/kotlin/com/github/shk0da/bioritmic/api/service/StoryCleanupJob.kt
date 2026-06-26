package com.github.shk0da.bioritmic.api.service

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class StoryCleanupJob(
    val storyService: StoryService
) {

    private val log = LoggerFactory.getLogger(StoryCleanupJob::class.java)

    @Scheduled(fixedRate = 3600000)
    fun cleanup() {
        log.info("Starting expired stories cleanup")
        GlobalScope.launch {
            try {
                storyService.deleteExpiredStories()
                log.info("Expired stories cleanup completed")
            } catch (e: Exception) {
                log.error("Failed to cleanup expired stories", e)
            }
        }
    }
}
