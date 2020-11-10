package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.domain.UserSettings
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.GisDataR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.GisUserR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserSettingsR2dbcRepository
import com.github.shk0da.bioritmic.api.utils.StringUtils.isNotBlank
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import java.sql.Timestamp

@Service
class UserService(val userJpaRepository: UserJpaRepository,
                  val userR2dbcRepository: UserR2dbcRepository,
                  val gisDataR2dbcRepository: GisDataR2dbcRepository,
                  val userSettingsR2dbcRepository: UserSettingsR2dbcRepository,
                  val gisUserR2dbcRepository: GisUserR2dbcRepository,
                  val emailService: EmailService) {

    private val log = LoggerFactory.getLogger(UserService::class.java)

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun findUserByEmail(email: String): User? {
        return userJpaRepository.findByEmail(email)
    }

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun isUserExists(email: String): Boolean {
        return userJpaRepository.existsByEmail(email)
    }

    @Transactional(readOnly = true)
    fun findUserById(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
    }

    @Transactional(readOnly = true)
    fun findUserByIdWithSettings(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
                .map { user ->
                    userSettingsR2dbcRepository.findById(user.id!!)
                            .map {
                                user.userSettings = it
                                user
                            }
                            .switchIfEmpty(Mono.just(user))
                }
                .flatMap { it }
    }

    @Transactional
    fun createNewUser(userModel: UserModel): Mono<User> {
        return userR2dbcRepository.save(User.of(userModel))
    }

    @Transactional
    fun updateUserById(userId: Long, userInfo: UserInfo): Mono<User> {
        return userR2dbcRepository.findById(userId)
                .map { user ->
                    with(userInfo) {
                        if (isNotBlank(name)) {
                            user.name = name
                        }
                        if (isNotBlank(email) && !user.email.equals(email)) {
                            if (isUserExists(email!!)) throw ApiException(ErrorCode.USER_EXISTS)
                            user.setRecoveryCode()
                            emailService.sendConfirmationChangeEmail(user.email!!, email, user.recoveryCode!!)
                        }
                        if (null != birthday) {
                            user.birthday = Timestamp(birthday.time)
                        }
                    }
                    userR2dbcRepository.save(user)
                }
                .flatMap { it }
    }

    @Transactional
    fun updateEmail(user: User, email: String): Mono<User> {
        if (isUserExists(email)) throw ApiException(ErrorCode.USER_EXISTS)
        user.resetRecoveryCode()
        user.email = email
        return userR2dbcRepository.save(user)
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

    @Transactional(readOnly = true)
    fun searchByFilter(search: UserSearch): Flux<GisUser> {
        return gisDataR2dbcRepository.findById(search.userId!!)
                .map {
                    gisUserR2dbcRepository.findNearest(
                            it.userId!!,
                            it.lat!!,
                            it.lon!!,
                            search.distance,
                            search.timestamp,
                    )
                }
                .flatMapMany { it }
                .doOnError {
                    log.error("Failed get nearest users for [{}]: {}", search, it.message)
                }
    }

    @Transactional
    fun getUserSettingsById(userId: Long): Mono<UserSettings> {
        return userSettingsR2dbcRepository.findById(userId)
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.SETTINGS_NOT_FOUND)))
    }

    @Transactional
    fun updateUserSettingsById(userId: Long, settings: UserSettingsModel): Mono<UserSettings> {
        return userSettingsR2dbcRepository.findById(userId)
                .switchIfEmpty(Mono.just(UserSettings()))
                .map { userSettings ->
                    with(userSettings) {
                        if (null != gender) {
                            gender = settings.gender
                        }
                        if (null != ageMin) {
                            ageMin = settings.ageMin
                        }
                        if (null != ageMax) {
                            ageMax = settings.ageMax
                        }
                        if (null != distance) {
                            distance = settings.distance
                        }
                    }
                    userSettingsR2dbcRepository.save(userSettings)
                }
                .flatMap { it }
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.SETTINGS_NOT_FOUND)))
    }
}
