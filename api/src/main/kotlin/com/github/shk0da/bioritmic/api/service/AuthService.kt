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
import org.infinispan.Cache
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AuthService(
    val authRepository: AuthRepository,
    val userRepository: UserRepository,
    val emailService: EmailService,
    val authTokenCache: Cache<String, Auth>
) {

    @Transactional
    suspend fun deleteAuthByUserId(userId: UUID) {
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
            currentAuth.accessToken?.let { authTokenCache.remove(it) }
        }
        authTokenCache[newAuth.accessToken!!] = newAuth
        return authRepository.save(newAuth)
    }

    @Transactional
    suspend fun refreshToken(userToken: UserToken): UserToken {
        val refreshTokenValue = userToken.refreshToken
        if (refreshTokenValue.isBlank()) {
            throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        }

        val auth = authRepository.findByRefreshToken(refreshTokenValue)
            ?: run {
                if (userToken.email.isBlank()) {
                    null
                } else {
                    val user = userRepository.findByEmail(userToken.email)
                        ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
                    authRepository.findByUserIdAndRefreshToken(user.id!!, refreshTokenValue)
                }
            }
            ?: throw ApiException(ErrorCode.AUTH_NOT_FOUND)

        if (auth.isExpired()) {
            auth.accessToken?.let { authTokenCache.remove(it) }
            authRepository.deleteByUserId(auth.userId!!)
            throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        }

        val user = userRepository.findById(auth.userId!!)
            ?: throw ApiException(ErrorCode.USER_NOT_FOUND)

        val oldAccessToken = auth.accessToken
        auth.refresh()
        oldAccessToken?.let { authTokenCache.remove(it) }
        authTokenCache[auth.accessToken!!] = auth
        authRepository.save(auth)
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

    fun findUserIdByAccessTokenCached(token: String): UUID? {
        val auth = authTokenCache[token] ?: return null
        if (auth.isExpired()) {
            return null
        }
        return auth.userId
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
    suspend fun resetPasswordWithCode(code: String, newPassword: String) {
        val user = findUserByRecoveryCode(code) ?: throw ApiException(ErrorCode.INVALID_RECOVERY_CODE)
        if (user.recoveryCodeExpireTime == null ||
            user.recoveryCodeExpireTime!!.time < System.currentTimeMillis()
        ) {
            throw ApiException(ErrorCode.INVALID_RECOVERY_CODE)
        }
        if (user.id == null || user.email == null) {
            throw ApiException(ErrorCode.USER_NOT_FOUND)
        }
        com.github.shk0da.bioritmic.api.utils.PasswordValidator.validate(newPassword)
        user.resetRecoveryCode()
        user.password = passwordEncoder.encode(newPassword)
        userRepository.save(user)
        deleteAuthByUserId(user.id!!)
    }
}
