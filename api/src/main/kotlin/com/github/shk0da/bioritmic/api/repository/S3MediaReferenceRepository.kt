package com.github.shk0da.bioritmic.api.repository

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
        keys.addAll(storyRepository.findAllMediaS3Keys())
        keys.addAll(feedbackRepository.findAllAttachmentS3Keys())
        return keys.filter { it.isNotBlank() }.toSet()
    }
}
