package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserRole
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface UserRoleRepository : CoroutineCrudRepository<UserRole, Long> {

    @Query("SELECT * FROM user_roles WHERE user_id = :userId")
    suspend fun findAllByUserId(userId: UUID): List<UserRole>

    @Query("SELECT * FROM user_roles WHERE user_id = :userId AND role = :role")
    suspend fun findByUserIdAndRole(userId: UUID, role: String): UserRole?

    @Query("SELECT * FROM user_roles WHERE user_id IN (:userIds)")
    suspend fun findAllByUserIds(@Param("userIds") userIds: Set<UUID>): List<UserRole>

    @Modifying
    @Query("INSERT INTO user_roles (user_id, role) VALUES (:userId, :role) ON CONFLICT (user_id, role) DO NOTHING")
    suspend fun addRole(userId: UUID, role: String)

    @Modifying
    @Query("DELETE FROM user_roles WHERE user_id = :userId AND role = :role")
    suspend fun removeRole(userId: UUID, role: String)
}
