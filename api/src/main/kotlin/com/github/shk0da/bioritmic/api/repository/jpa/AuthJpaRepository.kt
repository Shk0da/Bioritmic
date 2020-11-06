package com.github.shk0da.bioritmic.api.repository.jpa

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = jpaTransactionManager)
interface AuthJpaRepository : JpaRepository<Auth, Long> {
    fun findByUserId(userId: Long): Auth?
}