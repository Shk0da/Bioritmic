package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.ProfileBoost
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = transactionManager)
interface ProfileBoostRepository : CoroutineCrudRepository<ProfileBoost, Long> {

    @Query(
        "SELECT * FROM profile_boosts WHERE user_id = :userId " +
            "AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1"
    )
    suspend fun findActiveByUserId(userId: Long): ProfileBoost?

    @Query("DELETE FROM profile_boosts WHERE expires_at <= :now")
    suspend fun deleteExpired(now: Timestamp)
}
