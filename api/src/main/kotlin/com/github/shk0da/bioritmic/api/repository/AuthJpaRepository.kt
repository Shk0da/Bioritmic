package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = jpaTransactionManager)
interface AuthJpaRepository : JpaRepository<Auth, Long> {

    fun findByUserId(userId: Long): Auth?

    @Transactional(readOnly = true)
    fun findByUserIdAndRefreshToken(userId: Long, refreshToken: String): Auth?

    @Transactional(readOnly = true)
    fun findByAccessToken(token: String): Auth?

    @Transactional
    fun deleteByUserId(userId: Long)
}
