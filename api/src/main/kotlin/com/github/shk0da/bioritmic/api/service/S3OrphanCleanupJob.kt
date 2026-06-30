package com.github.shk0da.bioritmic.api.service

import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class S3OrphanCleanupJob(
    private val s3OrphanCleanupService: S3OrphanCleanupService,
) {

    private val log = LoggerFactory.getLogger(S3OrphanCleanupJob::class.java)

    @Scheduled(cron = "0 0 3 * * ?")
    fun cleanup() {
        log.info("Starting orphaned S3 media cleanup")
        GlobalScope.launch {
            try {
                s3OrphanCleanupService.cleanupOrphanedMedia()
                log.info("Orphaned S3 media cleanup completed")
            } catch (e: Exception) {
                log.error("Failed to cleanup orphaned S3 media", e)
            }
        }
    }
}
