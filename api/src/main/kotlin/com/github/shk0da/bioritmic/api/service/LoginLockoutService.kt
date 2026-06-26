package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.AppSecurityProperties
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Service
class LoginLockoutService(
    private val userRepository: UserRepository,
    private val appSecurityProperties: AppSecurityProperties
) {

    @Transactional(readOnly = true)
    suspend fun ensureNotLocked(userId: UUID) {
        val lockedUntil = userRepository.findById(userId)?.lockedUntil ?: return
        if (lockedUntil.after(Timestamp(System.currentTimeMillis()))) {
            throw ApiException(ErrorCode.ACCOUNT_LOCKED)
        }
    }

    @Transactional
    suspend fun recordFailedLogin(userId: UUID) {
        val config = appSecurityProperties.security.loginLockout
        userRepository.incrementFailedLoginAttempts(userId)
        val attempts = userRepository.getFailedLoginAttempts(userId) ?: 0
        if (attempts >= config.maxAttempts) {
            val lockUntil = Timestamp(
                System.currentTimeMillis() + config.lockMinutes * 60_000
            )
            userRepository.setLockedUntil(userId, lockUntil)
        }
    }

    @Transactional
    suspend fun resetFailedLogins(userId: UUID) {
        userRepository.resetLoginLockout(userId)
    }
}
