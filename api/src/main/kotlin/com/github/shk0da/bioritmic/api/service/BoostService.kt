package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.ProfileBoost
import com.github.shk0da.bioritmic.api.repository.ProfileBoostRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.Instant

@Service
class BoostService(
    val profileBoostRepository: ProfileBoostRepository,
    val subscriptionService: SubscriptionService
) {

    private val log = LoggerFactory.getLogger(BoostService::class.java)

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun isBoosted(userId: Long): Boolean {
        val boost = profileBoostRepository.findActiveByUserId(userId) ?: return false
        return boost.expiresAt?.after(Timestamp.from(Instant.now())) == true
    }

    suspend fun getBoostedUserIds(userIds: Set<Long>): Set<Long> {
        if (userIds.isEmpty()) return emptySet()
        val now = Timestamp.from(Instant.now())
        val boosted = mutableSetOf<Long>()
        for (userId in userIds) {
            val boost = profileBoostRepository.findActiveByUserId(userId)
            if (boost != null && boost.expiresAt?.after(now) == true) {
                boosted.add(userId)
            }
        }
        return boosted
    }

    @Transactional
    suspend fun activateBoost(userId: Long, hours: Int = 24): ProfileBoost {
        val isPro = subscriptionService.isProUser(userId)
        if (!isPro) {
            throw IllegalArgumentException("Only Pro users can activate boost")
        }

        val existing = profileBoostRepository.findActiveByUserId(userId)
        if (existing != null) {
            val now = Timestamp.from(Instant.now())
            if (existing.expiresAt != null && existing.expiresAt!!.after(now)) {
                val newExpiresAt = Timestamp(existing.expiresAt!!.time + hours * 3600L * 1000)
                existing.expiresAt = newExpiresAt
                val saved = profileBoostRepository.save(existing)
                log.info("Extended profile boost for userId={}, new expiresAt={}", userId, newExpiresAt)
                return saved
            }
        }

        val now = Timestamp.from(Instant.now())
        val expiresAt = Timestamp(now.time + hours * 3600L * 1000)
        val boost = ProfileBoost().apply {
            this.userId = userId
            this.startedAt = now
            this.expiresAt = expiresAt
        }
        val saved = profileBoostRepository.save(boost)
        log.info("Activated profile boost for userId={}, expiresAt={}", userId, expiresAt)
        return saved
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun getActiveBoost(userId: Long): ProfileBoost? {
        return profileBoostRepository.findActiveByUserId(userId)
    }

    @Transactional
    suspend fun cleanupExpiredBoosts() {
        val now = Timestamp.from(Instant.now())
        profileBoostRepository.deleteExpired(now)
        log.info("Cleaned up expired profile boosts")
    }
}
