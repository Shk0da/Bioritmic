package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Subscription
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface SubscriptionRepository : CoroutineCrudRepository<Subscription, Long> {

    @Query("SELECT * FROM subscriptions WHERE user_id = :userId AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1")
    suspend fun findActiveByUserId(userId: UUID): Subscription?

    @Query("SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan = :plan AND status = :status)")
    suspend fun existsByUserIdAndPlanAndStatus(userId: UUID, plan: String, status: String): Boolean
}
