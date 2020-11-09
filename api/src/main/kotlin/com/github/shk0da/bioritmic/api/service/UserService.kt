package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.GisDataModel
import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.GisDataR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserSettingsR2dbcRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono

@Service
class UserService(val userJpaRepository: UserJpaRepository,
                  val userR2dbcRepository: UserR2dbcRepository,
                  val gisDataR2dbcRepository: GisDataR2dbcRepository,
                  val userSettingsR2dbcRepository: UserSettingsR2dbcRepository) {

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun findUserByEmail(email: String): User? {
        return userJpaRepository.findByEmail(email)
    }

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun isUserExists(userModel: UserModel): Boolean {
        return userJpaRepository.existsByEmail(userModel.email)
    }

    @Transactional(readOnly = true)
    fun findUserById(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
    }

    @Transactional(readOnly = true)
    fun findUserByIdWithSettings(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
                .map {user ->
                    userSettingsR2dbcRepository.findById(user.id!!)
                            .map {
                                user.userSettings = it
                                user
                            }
                }
                .flatMap { it }
    }

    @Transactional
    fun createNewUser(userModel: UserModel): Mono<User> {
        return userR2dbcRepository.save(User.of(userModel))
    }

    @Transactional(readOnly = true)
    fun deleteUserById(userId: Long): Mono<Void> {
        return userR2dbcRepository.deleteById(userId)
    }

    @Transactional(readOnly = true)
    fun getGis(userId: Long): Mono<GisData> {
        return gisDataR2dbcRepository.findById(userId)
    }

    @Transactional
    fun saveGis(userId: Long, gisDataModel: GisDataModel): Mono<GisDataModel> {
        val gisData = GisData.of(userId, gisDataModel)
        return gisDataR2dbcRepository.insert(
                gisData.userId,
                gisData.lat,
                gisData.lon,
                gisData.timestamp,
        ).map { GisDataModel.of(gisData) }
    }

    @Transactional
    fun searchByFilter(it: UserSearch): Flux<User> {
        return gisDataR2dbcRepository.findById(it.userId)
                .map { gisDataR2dbcRepository.findNearest(it.lat!!, it.lon!!, 500) }
                .log()
                .map { userR2dbcRepository.findAllById(it) }
                .flatMapMany { it }
    }
}
