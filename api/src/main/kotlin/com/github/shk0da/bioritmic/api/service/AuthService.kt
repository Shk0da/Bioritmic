package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.repository.jpa.AuthJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.AuthR2dbcRepository
import org.springframework.stereotype.Service
import reactor.core.publisher.Mono

@Service
class AuthService(val authJpaRepository: AuthJpaRepository, val authR2dbcRepository: AuthR2dbcRepository) {

    fun createNewAuth(user: User) : Mono<Auth> {
        val newAuth = Auth.createFrom(user)
        val currentAuth = authJpaRepository.findByUserId(userId = user.id!!)
        if (null != currentAuth) {
            newAuth.id = currentAuth.id
        }
        return authR2dbcRepository.save(newAuth)
    }
}
