package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.domain.Auth
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono

@Repository
interface AuthR2dbcRepository : R2dbcRepository<Auth, Long> {

    @Transactional(readOnly = true)
    fun findByUserId(userId: Long): Mono<Auth?>

    @Transactional(readOnly = true)
    fun findByUserIdAndRefreshToken(userId: Long, refreshToken: String): Mono<Auth?>

    @Transactional(readOnly = true)
    fun findByAccessToken(token: String): Mono<Auth?>

    fun deleteByUserId(userId: Long)
}