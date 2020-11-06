package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.repository.jpa.AuthJpaRepository
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.AuthR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.generateRandomPassword
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono
import java.sql.Timestamp
import java.util.*
import java.util.concurrent.TimeUnit

@Service
class AuthService(val authJpaRepository: AuthJpaRepository,
                  val authR2dbcRepository: AuthR2dbcRepository,
                  val userJpaRepository: UserJpaRepository,
                  val userR2dbcRepository: UserR2dbcRepository,
                  val emailService: EmailService) {

    private val log = LoggerFactory.getLogger(AuthService::class.java)

    @Transactional
    fun deleteAuthByUserId(userId: Long): Mono<Void> {
        return authR2dbcRepository.deleteByUserId(userId)
    }

    @Transactional
    fun createNewAuth(user: User): Mono<Auth> {
        val newAuth = Auth.createFrom(user)
        val currentAuth = authJpaRepository.findByUserId(userId = user.id!!)
        if (null != currentAuth) {
            newAuth.id = currentAuth.id
            newAuth.refreshToken = newAuth.refreshToken
        }
        return authR2dbcRepository.save(newAuth)
    }

    @Transactional(readOnly = true)
    fun getAuthByAccessToken(token: String): Mono<Auth?> {
        return authR2dbcRepository.findByAccessToken(token)
    }

    @Transactional
    fun sendRecoveryEmail(user: User): Mono<Unit> {
        if (null == user.id) {
            throw ApiException("Id was not be empty!")
        }
        if (null == user.email) {
            throw ApiException("Email was not be empty!")
        }

        val code = UUID.randomUUID().toString()
        user.recoveryCode = code
        user.recoveryCodeExpireTime = Timestamp(System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(60))
        return userR2dbcRepository.save(user)
                .map {
                    val link = "http://localhost:8080/api/v1/reset-password?code=$code"
                    log.debug("Send recovery link: '{}' for {}", link, user)
                    emailService.sendTextEmail(user.email!!, "Reset password", link)
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
        user.recoveryCode?.let { user.recoveryCode = null }
        user.recoveryCodeExpireTime?.let { user.recoveryCodeExpireTime = null }
        val newPassword = generateRandomPassword(10)
        user.password = passwordEncoder.encode(newPassword)
        return userR2dbcRepository.save(user)
                .map {
                    log.debug("Send new password: '{}' for {}", newPassword, user)
                    emailService.sendTextEmail(user.email!!, "New password", newPassword)
                }
    }
}
