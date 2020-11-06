package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono

@Service
class UserService(val userJpaRepository: UserJpaRepository, val userR2dbcRepository: UserR2dbcRepository) {

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun findUserByEmail(email: String): User? {
        return userJpaRepository.findByEmail(email)
    }

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun isUserExists(userModel: UserModel): Boolean {
        return userJpaRepository.existsByEmail(userModel.email)
    }

    @Transactional(readOnly = true, transactionManager = r2dbcTransactionManager)
    fun findUserById(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
    }

    @Transactional(transactionManager = r2dbcTransactionManager)
    fun createNewUser(userModel: UserModel): Mono<User> {
        return userR2dbcRepository.save(User.of(userModel))
    }
}
