package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.repository.SwipeSkipRepository
import com.github.shk0da.bioritmic.api.repository.UserLikeRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class SwipeActionService(
    private val swipeSkipRepository: SwipeSkipRepository,
    private val userLikeRepository: UserLikeRepository,
    private val userVerificationService: UserVerificationService,
) {

    @Transactional
    suspend fun likeUser(userId: UUID, otherUserId: UUID) {
        userVerificationService.requireVerified(userId)
        if (userId == otherUserId) return
        userLikeRepository.upsert(userId, otherUserId)
        clearSkip(userId, otherUserId)
    }

    @Transactional
    suspend fun skipUser(userId: UUID, otherUserId: UUID) {
        userVerificationService.requireVerified(userId)
        if (userId == otherUserId) return
        swipeSkipRepository.upsert(userId, otherUserId)
    }

    @Transactional
    suspend fun clearSkip(userId: UUID, otherUserId: UUID) {
        if (userId == otherUserId) return
        swipeSkipRepository.deleteByUserIdAndOtherUserId(userId, otherUserId)
    }
}
