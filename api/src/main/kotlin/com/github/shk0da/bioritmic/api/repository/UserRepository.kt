package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.User
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface UserRepository : CoroutineCrudRepository<User, UUID> {

    @Transactional(readOnly = true)
    suspend fun existsByEmail(email: String): Boolean

    @Transactional(readOnly = true)
    suspend fun findByEmail(email: String): User?

    @Transactional(readOnly = true)
    suspend fun findByRecoveryCode(code: String): User?

    @Query("SELECT * FROM users WHERE is_verified = false")
    suspend fun findUnverifiedUsers(): List<User>

    @Modifying
    @Query("UPDATE users SET is_verified = :verified WHERE id = :userId")
    suspend fun setVerified(userId: UUID, verified: Boolean)

    @Modifying
    @Query("UPDATE users SET last_active_at = :lastActiveAt WHERE id = :userId")
    suspend fun updateLastActiveAt(userId: UUID, lastActiveAt: java.sql.Timestamp)

    @Query("SELECT COUNT(*) FROM users")
    suspend fun countAll(): Long

    @Query("SELECT COUNT(*) FROM users WHERE is_verified = true")
    suspend fun countVerified(): Long

    @Query("SELECT COUNT(*) FROM users WHERE is_verified = false")
    suspend fun countUnverified(): Long

    @Query("SELECT COUNT(*) FROM users WHERE email = :email AND id != :excludeId")
    suspend fun countByEmailExcludingId(@Param("email") email: String, @Param("excludeId") excludeId: Long): Long
}
