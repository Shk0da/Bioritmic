package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.repository.AuthJpaRepository
import com.github.shk0da.bioritmic.api.repository.UserJpaRepository
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.generateRandomPassword
import org.infinispan.Cache
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthService(
    val authJpaRepository: AuthJpaRepository,
    val userJpaRepository: UserJpaRepository,
    val emailService: EmailService,
    val authTokenCache: Cache<String, Auth>
) {

    private val log = LoggerFactory.getLogger(AuthService::class.java)

    @Transactional
    suspend fun deleteAuthByUserId(userId: Long) {
        val auth = authJpaRepository.findByUserId(userId)
        if (null != auth?.accessToken) {
            authTokenCache.remove(auth.accessToken)
        }
        authJpaRepository.deleteByUserId(userId)
    }

    @Transactional
    fun createNewAuth(user: User): Auth {
        val newAuth = Auth.createFrom(user)
        val currentAuth = authJpaRepository.findByUserId(userId = user.id!!)
        if (null != currentAuth) {
            newAuth.id = currentAuth.id
            newAuth.refreshToken = newAuth.refreshToken
        }
        authTokenCache[newAuth.accessToken] = newAuth
        return authJpaRepository.save(newAuth)
    }

    @Transactional
    fun refreshToken(userToken: UserToken): UserToken {
        val user = userJpaRepository.findByEmail(userToken.email) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val auth = authJpaRepository.findByUserIdAndRefreshToken(user.id!!, userToken.refreshToken) ?: throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        val newAuth = auth.refresh()
        authTokenCache[auth.accessToken] = auth
        authJpaRepository.save(newAuth)
        return UserToken.of(user, auth)
    }

    @Transactional(readOnly = true)
    fun getAuthByAccessToken(token: String): Auth? {
        val auth = authTokenCache[token] ?: authJpaRepository.findByAccessToken(token)
        if (null != auth) {
            authTokenCache[auth.accessToken] = auth
        }
        return auth
    }

    @Transactional
    fun sendRecoveryEmail(user: User) {
        if (null == user.id) {
            throw ApiException("Id was not be empty!")
        }
        if (null == user.email) {
            throw ApiException("Email was not be empty!")
        }

        user.setRecoveryCode()
        userJpaRepository.save(user)
        emailService.sendRecoveryLink(user.email!!, user.recoveryCode!!)
    }

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun findUserByRecoveryCode(code: String): User? {
        return userJpaRepository.findByRecoveryCode(code)
    }

    @Transactional
    fun resetPasswordAndSendEmail(user: User) {
        if (null == user.id) {
            throw ApiException("Id was not be empty!")
        }
        if (null == user.email) {
            throw ApiException("Email was not be empty!")
        }
        user.resetRecoveryCode()
        val newPassword = generateRandomPassword(10)
        user.password = passwordEncoder.encode(newPassword)
        userJpaRepository.save(user)
        val auth = authJpaRepository.findByUserId(user.id!!)
        authTokenCache.remove(auth?.accessToken)
        authJpaRepository.deleteByUserId(user.id!!)
        emailService.sendNewPassword(user.email!!, newPassword)
    }
}
