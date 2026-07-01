package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.ProfileBoost
import com.github.shk0da.bioritmic.api.repository.DiamondAtomicRepository
import com.github.shk0da.bioritmic.api.repository.ProfileBoostRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

@Service
class BoostService(
    val profileBoostRepository: ProfileBoostRepository,
    val diamondAtomicRepository: DiamondAtomicRepository,
    private val diamondBalanceNotifier: DiamondBalanceNotifier,
) {

    private val log = LoggerFactory.getLogger(BoostService::class.java)

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun isBoosted(userId: UUID): Boolean {
        val boost = profileBoostRepository.findActiveByUserId(userId) ?: return false
        return boost.expiresAt?.after(Timestamp.from(Instant.now())) == true
    }

    suspend fun getBoostedUserIds(userIds: Set<UUID>): Set<UUID> {
        if (userIds.isEmpty()) return emptySet()
        return profileBoostRepository.findActiveByUserIds(userIds).map { it.userId }.toSet()
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun activateBoost(userId: UUID, hours: Int = 24): BoostActivationResult {
        val result = diamondAtomicRepository.purchaseBoost(userId, DiamondService.BOOST_COST, hours)
        val boost = ProfileBoost().apply {
            id = result.boostId
            this.userId = userId
            startedAt = Timestamp.from(Instant.now())
            expiresAt = result.expiresAt
        }
        log.info(
            "Activated profile boost for userId={}, expiresAt={}, balance={}",
            userId,
            result.expiresAt,
            result.newBalance,
        )
        diamondBalanceNotifier.notify(userId, result.newBalance)
        return BoostActivationResult(boost, result.newBalance)
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun getActiveBoost(userId: UUID): ProfileBoost? {
        return profileBoostRepository.findActiveByUserId(userId)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun cleanupExpiredBoosts() {
        val now = Timestamp.from(Instant.now())
        profileBoostRepository.deleteExpired(now)
        log.info("Cleaned up expired profile boosts")
    }
}

data class BoostActivationResult(
    val boost: ProfileBoost,
    val balance: Long,
)
