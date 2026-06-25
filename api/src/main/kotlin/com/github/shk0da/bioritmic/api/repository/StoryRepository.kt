package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Story
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface StoryRepository : CoroutineCrudRepository<Story, Long> {

    @Transactional(readOnly = true)
    @Query("SELECT * FROM stories WHERE user_id = :userId AND expires_at > NOW() ORDER BY created_at DESC")
    suspend fun findActiveByUserId(userId: UUID): List<Story>

    @Transactional(readOnly = true)
    @Query("SELECT * FROM stories WHERE expires_at > NOW() ORDER BY created_at DESC")
    suspend fun findAllActive(): List<Story>

    @Modifying
    @Query("DELETE FROM stories WHERE expires_at < :now")
    suspend fun deleteExpired(now: Timestamp)
}
