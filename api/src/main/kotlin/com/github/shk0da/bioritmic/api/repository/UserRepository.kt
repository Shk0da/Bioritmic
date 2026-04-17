package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.User
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface UserRepository : CoroutineCrudRepository<User, Long> {

    @Transactional(readOnly = true)
    suspend fun existsByEmail(email: String): Boolean

    @Transactional(readOnly = true)
    suspend fun findByEmail(email: String): User?

    @Transactional(readOnly = true)
    suspend fun findByRecoveryCode(code: String): User?
}
