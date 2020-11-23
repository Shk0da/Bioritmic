package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.repository.jpa.AuthJpaRepository
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.AuthR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.generateRandomPassword
import org.infinispan.Cache
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono

@Service
class AuthService(val authJpaRepository: AuthJpaRepository,
                  val authR2dbcRepository: AuthR2dbcRepository,
                  val userJpaRepository: UserJpaRepository,
                  val userR2dbcRepository: UserR2dbcRepository,
                  val emailService: EmailService,
                  val authTokenCache: Cache<String, Auth>) {

    private val log = LoggerFactory.getLogger(AuthService::class.java)

    @Transactional
    fun deleteAuthByUserId(userId: Long): Mono<Void> {
        return authR2dbcRepository.findByUserId(userId)
                .map { auth ->
                    authTokenCache.remove(auth?.accessToken)
                    authR2dbcRepository.deleteByUserId(userId)
                }.flatMap { it }
    }

    @Transactional
    fun createNewAuth(user: User): Mono<Auth> {
        val newAuth = Auth.createFrom(user)
        val currentAuth = authJpaRepository.findByUserId(userId = user.id!!)
        if (null != currentAuth) {
            newAuth.id = currentAuth.id
            newAuth.refreshToken = newAuth.refreshToken
        }
        authTokenCache[newAuth.accessToken] = newAuth
        return authR2dbcRepository.save(newAuth)
    }

    @Transactional
    fun refreshToken(userToken: UserToken): Mono<UserToken> {
        return userR2dbcRepository.findByEmail(userToken.email)
                .map {
                    val user = it
                    authR2dbcRepository.findByUserIdAndRefreshToken(user!!.id!!, userToken.refreshToken)
                            .flatMap { auth ->
                                val newAuth = auth!!.refresh()
                                authTokenCache[auth.accessToken] = auth
                                authR2dbcRepository.save(newAuth)
                            }
                            .map { auth -> UserToken.of(user, auth) }
                            .switchIfEmpty(Mono.error(ApiException(ErrorCode.AUTH_NOT_FOUND)))
                }
                .flatMap { it }
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.USER_NOT_FOUND)))
    }

    @Transactional(readOnly = true)
    fun getAuthByAccessToken(token: String): Mono<Auth?> {
        return Mono
                .justOrEmpty(authTokenCache[token])
                .switchIfEmpty(authR2dbcRepository
                        .findByAccessToken(token)
                        .doOnSuccess { auth ->
                            if (null != auth) {
                                authTokenCache[auth.accessToken] = auth
                            }
                        }
                )
    }

    @Transactional
    fun sendRecoveryEmail(user: User): Mono<Unit> {
        if (null == user.id) {
            throw ApiException("Id was not be empty!")
        }
        if (null == user.email) {
            throw ApiException("Email was not be empty!")
        }

        user.setRecoveryCode()
        return userR2dbcRepository.save(user)
                .map {
                    emailService.sendRecoveryLink(user.email!!, user.recoveryCode!!)
                }
    }

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun findUserByRecoveryCode(code: String): User? {
        return userJpaRepository.findByRecoveryCode(code)
    }

    @Transactional
    fun resetPasswordAndSendEmail(user: User): Mono<Unit> {
        if (null == user.id) {
            throw ApiException("Id was not be empty!")
        }
        if (null == user.email) {
            throw ApiException("Email was not be empty!")
        }
        user.resetRecoveryCode()
        val newPassword = generateRandomPassword(10)
        user.password = passwordEncoder.encode(newPassword)
        return userR2dbcRepository.save(user)
                .map {
                    authR2dbcRepository.findByUserId(user.id!!)
                            .map { auth ->
                                authTokenCache.remove(auth?.accessToken)
                                authR2dbcRepository.deleteByUserId(user.id!!)
                            }.map {
                                emailService.sendNewPassword(user.email!!, newPassword)
                            }
                }
    }
}
