package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface AuthRepository : CoroutineCrudRepository<Auth, Long> {

    suspend fun findByUserId(userId: UUID): Auth?

    @Transactional(readOnly = true)
    suspend fun findByUserIdAndRefreshToken(userId: UUID, refreshToken: String): Auth?

    @Transactional(readOnly = true)
    suspend fun findByRefreshToken(refreshToken: String): Auth?

    @Transactional(readOnly = true)
    suspend fun findByAccessToken(token: String): Auth?

    @Transactional
    suspend fun deleteByUserId(userId: UUID)
}
