package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.domain.User
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono

@Repository
interface UserR2dbcRepository : R2dbcRepository<User, Long> {

    @Transactional(readOnly = true)
    fun findByEmail(email: String): Mono<User?>
}