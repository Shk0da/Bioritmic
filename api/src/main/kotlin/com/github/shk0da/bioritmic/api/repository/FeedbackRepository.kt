package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserFeedback
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface FeedbackRepository : CoroutineCrudRepository<UserFeedback, Long> {

    @Query("SELECT COUNT(*) FROM user_feedback WHERE status = 'NEW'")
    suspend fun countNew(): Long

    @Query("SELECT * FROM user_feedback ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
    suspend fun findAllPaginated(limit: Int, offset: Long): List<UserFeedback>

    @Query("SELECT * FROM user_feedback WHERE status = :status ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
    suspend fun findByStatusPaginated(status: String, limit: Int, offset: Long): List<UserFeedback>

    @Query("SELECT COUNT(*) FROM user_feedback")
    suspend fun countAll(): Long

    @Query("SELECT COUNT(*) FROM user_feedback WHERE status = :status")
    suspend fun countByStatus(status: String): Long

    @Modifying
    @Query("UPDATE user_feedback SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: Long, status: String)
}
