package com.github.shk0da.bioritmic.service

import com.github.shk0da.bioritmic.api.repository.S3MediaReferenceRepository
import com.github.shk0da.bioritmic.api.service.S3OrphanCleanupService
import com.github.shk0da.bioritmic.api.service.S3Service
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.Mockito

class S3OrphanCleanupServiceTest {

    private val s3Service = Mockito.mock(S3Service::class.java)
    private val s3MediaReferenceRepository = Mockito.mock(S3MediaReferenceRepository::class.java)
    private val cleanupService = S3OrphanCleanupService(s3Service, s3MediaReferenceRepository)

    @Test
    fun `cleanupOrphanedMedia deletes only unreferenced keys`() = runBlocking {
        val referencedProfileKey = "profile/user-1/cropp_500x500.jpg"
        val referencedMailboxKey = "mailbox/images/user-1/user-2/file.jpg"
        val referencedFeedbackKey = "feedback/1/screenshot.jpg"
        val orphanedProfileKey = "profile/user-2/cropp_500x500.jpg"
        val orphanedFeedbackKey = "feedback/2/old-attachment.jpg"

        Mockito.`when`(s3MediaReferenceRepository.findAllReferencedKeys()).thenReturn(
            setOf(referencedProfileKey, referencedMailboxKey, referencedFeedbackKey)
        )
        Mockito.`when`(s3Service.listObjectKeys("profile/")).thenReturn(
            listOf(referencedProfileKey, orphanedProfileKey)
        )
        Mockito.`when`(s3Service.listObjectKeys("mailbox/")).thenReturn(listOf(referencedMailboxKey))
        Mockito.`when`(s3Service.listObjectKeys("feedback/")).thenReturn(
            listOf(referencedFeedbackKey, orphanedFeedbackKey)
        )

        val deletedCount = cleanupService.cleanupOrphanedMedia()

        assertEquals(2, deletedCount)
        Mockito.verify(s3Service).deletePhoto(orphanedProfileKey)
        Mockito.verify(s3Service).deletePhoto(orphanedFeedbackKey)
        Mockito.verify(s3Service, Mockito.never()).deletePhoto(referencedProfileKey)
        Mockito.verify(s3Service, Mockito.never()).deletePhoto(referencedMailboxKey)
        Mockito.verify(s3Service, Mockito.never()).deletePhoto(referencedFeedbackKey)
        Mockito.verify(s3Service, Mockito.never()).listObjectKeys("stories/")
    }

    @Test
    fun `cleanupOrphanedMedia returns zero when all keys are referenced`() = runBlocking {
        val key = "profile/user-1/cropp_500x500.jpg"
        Mockito.`when`(s3MediaReferenceRepository.findAllReferencedKeys()).thenReturn(setOf(key))
        Mockito.`when`(s3Service.listObjectKeys("profile/")).thenReturn(listOf(key))
        Mockito.`when`(s3Service.listObjectKeys("mailbox/")).thenReturn(emptyList())
        Mockito.`when`(s3Service.listObjectKeys("feedback/")).thenReturn(emptyList())

        val deletedCount = cleanupService.cleanupOrphanedMedia()

        assertEquals(0, deletedCount)
        Mockito.verify(s3Service, Mockito.never()).deletePhoto(Mockito.anyString())
    }
}
