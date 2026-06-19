package com.github.shk0da.bioritmic.api.service

import kotlinx.coroutines.runBlocking
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
        runBlocking {
            storyService.deleteExpiredStories()
        }
        log.info("Expired stories cleanup completed")
    }
}
