package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Subscription
import com.github.shk0da.bioritmic.api.repository.SubscriptionRepository
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.Cacheable
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.concurrent.ConcurrentHashMap

@Service
class SubscriptionService(
    val subscriptionRepository: SubscriptionRepository
) {

    private val log = LoggerFactory.getLogger(SubscriptionService::class.java)

    @Value("\${premium.free-for-all:true}")
    private var freeForAll: Boolean = true

    private val proStatusCache = ConcurrentHashMap<Long, Pair<Boolean, Long>>()
    private val CACHE_TTL_MS = 60_000L

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun isProUser(userId: Long): Boolean {
        if (freeForAll) return true

        val cached = proStatusCache[userId]
        val now = System.currentTimeMillis()
        if (cached != null && (now - cached.second) < CACHE_TTL_MS) {
            return cached.first
        }

        val subscription = subscriptionRepository.findActiveByUserId(userId) ?: return false
        val result = subscription.plan == Subscription.PLAN_PRO &&
                subscription.expiresAt?.after(Timestamp(now)) == true
        proStatusCache[userId] = Pair(result, now)
        return result
    }

    fun isFreeForAll(): Boolean = freeForAll

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun getActiveSubscription(userId: Long): Subscription? {
        return subscriptionRepository.findActiveByUserId(userId)
    }

    @Transactional
    suspend fun activatePro(userId: Long, expiresAt: Timestamp) {
        proStatusCache.remove(userId)
        val existing = subscriptionRepository.findActiveByUserId(userId)
        if (existing != null && existing.plan == Subscription.PLAN_PRO) {
            existing.expiresAt = expiresAt
            subscriptionRepository.save(existing)
            log.info("Extended Pro subscription for userId={}, expiresAt={}", userId, expiresAt)
        } else {
            val subscription = Subscription().apply {
                this.userId = userId
                this.plan = Subscription.PLAN_PRO
                this.status = Subscription.STATUS_ACTIVE
                this.expiresAt = expiresAt
                this.createdAt = Timestamp(System.currentTimeMillis())
            }
            subscriptionRepository.save(subscription)
            log.info("Activated Pro subscription for userId={}, expiresAt={}", userId, expiresAt)
        }
    }

    @Transactional
    suspend fun cancelSubscription(userId: Long) {
        proStatusCache.remove(userId)
        val existing = subscriptionRepository.findActiveByUserId(userId) ?: return
        existing.status = Subscription.STATUS_CANCELLED
        subscriptionRepository.save(existing)
        log.info("Cancelled subscription for userId={}", userId)
    }
}
