package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.repository.AuthRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.generateRandomPassword
import org.infinispan.Cache
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthService(
    val authRepository: AuthRepository,
    val userRepository: UserRepository,
    val emailService: EmailService,
    val authTokenCache: Cache<String, Auth>
) {

    @Transactional
    suspend fun deleteAuthByUserId(userId: Long) {
        val auth = authRepository.findByUserId(userId)
        if (null != auth?.accessToken) {
            authTokenCache.remove(auth.accessToken)
        }
        authRepository.deleteByUserId(userId)
    }

    @Transactional
    suspend fun createNewAuth(user: User): Auth {
        val newAuth = Auth.createFrom(user)
        val currentAuth = authRepository.findByUserId(userId = user.id!!)
        if (null != currentAuth) {
            newAuth.id = currentAuth.id
        }
        authTokenCache[newAuth.accessToken] = newAuth
        return authRepository.save(newAuth)
    }

    @Transactional
    suspend fun refreshToken(userToken: UserToken): UserToken {
        val user = userRepository.findByEmail(userToken.email) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val auth = authRepository.findByUserIdAndRefreshToken(
            user.id!!, userToken.refreshToken
        ) ?: throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        if (auth.isExpired()) {
            authRepository.deleteByUserId(user.id!!)
            throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        }
        val newAuth = auth.refresh()
        authTokenCache[auth.accessToken] = auth
        authRepository.save(newAuth)
        return UserToken.of(user, auth)
    }

    @Transactional(readOnly = true)
    suspend fun getAuthByAccessToken(token: String): Auth? {
        val auth = authTokenCache[token] ?: authRepository.findByAccessToken(token)
        if (null != auth) {
            authTokenCache[auth.accessToken] = auth
        }
        return auth
    }

    @Transactional
    suspend fun sendRecoveryEmail(user: User) {
        if (null == user.id) {
            throw ApiException("Id was not be empty!")
        }
        if (null == user.email) {
            throw ApiException("Email was not be empty!")
        }

        user.setRecoveryCode()
        userRepository.save(user)
        emailService.sendRecoveryLink(user.email!!, user.recoveryCode!!)
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun findUserByRecoveryCode(code: String): User? {
        return userRepository.findByRecoveryCode(code)
    }

    @Transactional
    suspend fun resetPasswordAndSendEmail(user: User) {
        if (null == user.id) {
            throw ApiException("Id was not be empty!")
        }
        if (null == user.email) {
            throw ApiException("Email was not be empty!")
        }
        user.resetRecoveryCode()
        val newPassword = generateRandomPassword(10)
        user.password = passwordEncoder.encode(newPassword)
        userRepository.save(user)
        val auth = authRepository.findByUserId(user.id!!)
        authTokenCache.remove(auth?.accessToken)
        authRepository.deleteByUserId(user.id!!)
        emailService.sendNewPassword(user.email!!, newPassword)
    }
}
