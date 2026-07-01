package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.repository.S3MediaReferenceRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class S3OrphanCleanupService(
    private val s3Service: S3Service,
    private val s3MediaReferenceRepository: S3MediaReferenceRepository,
) {

    private val log = LoggerFactory.getLogger(S3OrphanCleanupService::class.java)

    suspend fun cleanupOrphanedMedia(): Int {
        val referencedKeys = s3MediaReferenceRepository.findAllReferencedKeys()
        var deletedCount = 0

        for (prefix in SCANNED_PREFIXES) {
            val objectKeys = s3Service.listObjectKeys(prefix)
            for (key in objectKeys) {
                if (key in referencedKeys) {
                    continue
                }
                s3Service.deletePhoto(key)
                deletedCount++
                log.info("Deleted orphaned S3 object: {}", key)
            }
        }

        if (deletedCount > 0) {
            log.info("Orphaned S3 cleanup removed {} object(s)", deletedCount)
        } else {
            log.debug("Orphaned S3 cleanup found nothing to remove")
        }

        return deletedCount
    }

    companion object {
        // Story media lifecycle is managed by StoryService.deleteExpiredStories (respects locked stories).
        private val SCANNED_PREFIXES = listOf("profile/", "mailbox/", "feedback/")
    }
}
