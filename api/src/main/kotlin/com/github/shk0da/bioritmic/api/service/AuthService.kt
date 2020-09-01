package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import org.springframework.stereotype.Service
import reactor.core.publisher.Mono

@Service
class AuthService(val userJpaRepository: UserJpaRepository, val userR2dbcRepository: UserR2dbcRepository) {

    fun isUserExists(userModel: UserModel): Boolean {
        return userJpaRepository.existsByEmail(userModel.email)
    }

    fun createNewUser(userModel: UserModel): Mono<User> {
        return userR2dbcRepository.save(User.of(userModel))
    }
}
