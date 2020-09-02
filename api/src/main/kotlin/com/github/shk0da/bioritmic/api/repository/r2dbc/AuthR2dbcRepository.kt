package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.domain.Auth
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import reactor.core.publisher.Mono

@Repository
interface AuthR2dbcRepository : R2dbcRepository<Auth, Long> {
    fun findByUserId(userId: Long): Mono<Auth?>
    fun deleteByUserId(userId: Long)
}