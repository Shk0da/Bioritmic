package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.model.UserToken
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono

@Service
@Transactional
class UserService(val userJpaRepository: UserJpaRepository, val userR2dbcRepository: UserR2dbcRepository) {

    fun findUser(userToken: UserToken): User? {
        return userJpaRepository.findByEmail(userToken.email)
    }

    fun findUser(authorizationModel: AuthorizationModel): User? {
        return userJpaRepository.findByEmail(authorizationModel.email)
    }

    fun isUserExists(userModel: UserModel): Boolean {
        return userJpaRepository.existsByEmail(userModel.email)
    }

    fun findUserById(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
    }

    fun createNewUser(userModel: UserModel): Mono<User> {
        return userR2dbcRepository.save(User.of(userModel))
    }
}
