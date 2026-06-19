package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserPushToken
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface UserPushTokenRepository : CoroutineCrudRepository<UserPushToken, Long> {

    @Query("SELECT * FROM user_push_tokens WHERE user_id = :userId")
    suspend fun findAllByUserId(userId: Long): List<UserPushToken>

    @Query("SELECT * FROM user_push_tokens WHERE token = :token")
    suspend fun findByToken(token: String): UserPushToken?

    @Modifying
    @Query("DELETE FROM user_push_tokens WHERE token = :token")
    suspend fun deleteByToken(token: String)

    @Modifying
    @Query("DELETE FROM user_push_tokens WHERE user_id = :userId")
    suspend fun deleteAllByUserId(userId: Long)
}
