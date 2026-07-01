package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.service.S3Service
import org.springframework.stereotype.Component

@Component
class S3MediaReferenceRepository(
    private val userPhotoRepository: UserPhotoRepository,
    private val mailboxRepository: MailboxRepository,
    private val storyRepository: StoryRepository,
    private val feedbackRepository: FeedbackRepository,
) {

    suspend fun findAllReferencedKeys(): Set<String> {
        val keys = linkedSetOf<String>()
        keys.addAll(userPhotoRepository.findAllS3Keys())
        keys.addAll(mailboxRepository.findAllMediaS3Keys())
        keys.addAll(
            storyRepository.findAllMediaUrls()
                .mapNotNull { S3Service.keyFromPhotoUrl(it) }
        )
        keys.addAll(feedbackRepository.findAllAttachmentS3Keys())
        return keys.filter { it.isNotBlank() }.toSet()
    }
}
