package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.repository.SwipeSkipRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class SwipeActionService(
    private val swipeSkipRepository: SwipeSkipRepository,
) {

    @Transactional
    suspend fun skipUser(userId: UUID, otherUserId: UUID) {
        if (userId == otherUserId) return
        swipeSkipRepository.upsert(userId, otherUserId)
    }

    @Transactional
    suspend fun clearSkip(userId: UUID, otherUserId: UUID) {
        if (userId == otherUserId) return
        swipeSkipRepository.deleteByUserIdAndOtherUserId(userId, otherUserId)
    }
}
