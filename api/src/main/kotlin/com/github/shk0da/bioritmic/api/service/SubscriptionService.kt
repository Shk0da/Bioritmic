package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Subscription
import com.github.shk0da.bioritmic.api.repository.SubscriptionRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Service
class SubscriptionService(
    val subscriptionRepository: SubscriptionRepository
) {

    private val log = LoggerFactory.getLogger(SubscriptionService::class.java)

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun isProUser(userId: Long): Boolean {
        val subscription = subscriptionRepository.findActiveByUserId(userId) ?: return false
        if (subscription.plan != Subscription.PLAN_PRO) return false
        val expiresAt = subscription.expiresAt ?: return false
        return expiresAt.after(Timestamp(System.currentTimeMillis()))
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun getActiveSubscription(userId: Long): Subscription? {
        return subscriptionRepository.findActiveByUserId(userId)
    }

    @Transactional
    suspend fun activatePro(userId: Long, expiresAt: Timestamp) {
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
        val existing = subscriptionRepository.findActiveByUserId(userId) ?: return
        existing.status = Subscription.STATUS_CANCELLED
        subscriptionRepository.save(existing)
        log.info("Cancelled subscription for userId={}", userId)
    }
}
