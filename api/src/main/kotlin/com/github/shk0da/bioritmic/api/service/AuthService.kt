package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.repository.AuthRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_BANNED
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
    val authTokenCache: Cache<String, Auth>,
    val diamondService: DiamondService,
    private val userRoleRepository: UserRoleRepository,
    private val reportService: ReportService,
) {

    @Transactional
    suspend fun deleteAuthByUserId(userId: UUID) {
        authRepository.findAllByUserId(userId).forEach { auth ->
            auth.accessToken?.let { authTokenCache.remove(it) }
        }
        authRepository.deleteByUserId(userId)
    }

    @Transactional
    suspend fun deleteAuthByAccessToken(accessToken: String) {
        authTokenCache.remove(accessToken)
        authRepository.deleteByAccessToken(accessToken)
    }

    @Transactional
    suspend fun createNewAuth(user: User): Auth {
        val newAuth = Auth.createFrom(user)
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
        if (auth == null) {
            if (userToken.email.isNotBlank()) {
                val user = userRepository.findByEmail(userToken.email)
                if (user?.id != null) {
                    ensureNotBanned(user.id!!)
                }
            }
            throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        }

        if (auth.isExpired()) {
            auth.accessToken?.let { authTokenCache.remove(it) }
            auth.id?.let { authRepository.deleteById(it) }
            throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        }

        val user = userRepository.findById(auth.userId!!)
            ?: throw ApiException(ErrorCode.USER_NOT_FOUND)

        ensureNotBanned(user.id!!)

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

    @Transactional
    suspend fun sendVerificationEmail(userId: UUID) {
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        sendVerificationEmail(user)
    }

    @Transactional
    suspend fun sendVerificationEmail(user: User) {
        if (user.isVerified) {
            return
        }
        if (user.id == null || user.email == null) {
            throw ApiException(ErrorCode.USER_NOT_FOUND)
        }
        user.setRecoveryCode()
        userRepository.save(user)
        emailService.sendVerificationEmail(user.email!!, user.recoveryCode!!)
    }

    @Transactional
    suspend fun verifyEmailWithCode(code: String) {
        val user = findUserByRecoveryCode(code) ?: throw ApiException(ErrorCode.INVALID_RECOVERY_CODE)
        if (user.recoveryCodeExpireTime == null ||
            user.recoveryCodeExpireTime!!.time < System.currentTimeMillis()
        ) {
            throw ApiException(ErrorCode.INVALID_RECOVERY_CODE)
        }
        if (user.id == null) {
            throw ApiException(ErrorCode.USER_NOT_FOUND)
        }
        user.resetRecoveryCode()
        val wasVerified = user.isVerified
        if (!user.isVerified) {
            user.isVerified = true
        }
        userRepository.save(user)
        if (!wasVerified) {
            diamondService.grantRegistrationBonus(user.id!!)
        }
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

    private suspend fun ensureNotBanned(userId: UUID) {
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (roles.any { it == ROLE_BANNED || it == "BANNED" } || reportService.isUserBanned(userId)) {
            throw ApiException(ErrorCode.USER_BANNED)
        }
    }
}
