package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.generateRandomPassword
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.Base64
import java.util.concurrent.TimeUnit

@Service
class SocialAuthService(
    val userService: UserService,
    val authService: AuthService
) {

    private val log = LoggerFactory.getLogger(SocialAuthService::class.java)

    @Transactional
    suspend fun handleGoogleLogin(idToken: String): UserToken {
        val payload = decodeJwtPayload(idToken)
        val email = payload["email"] as? String ?: throw ApiException(ErrorCode.INVALID_PARAMETER)
        val name = payload["name"] as? String ?: payload["given_name"] as? String ?: email.substringBefore("@")
        return findOrCreateAndAuth(email, name)
    }

    @Transactional
    suspend fun handleAppleLogin(idToken: String): UserToken {
        val payload = decodeJwtPayload(idToken)
        val email = payload["email"] as? String ?: throw ApiException(ErrorCode.INVALID_PARAMETER)
        val name = payload["name"] as? String ?: email.substringBefore("@")
        return findOrCreateAndAuth(email, name)
    }

    private suspend fun findOrCreateAndAuth(email: String, name: String): UserToken {
        var user = userService.findUserByEmail(email)
        if (user == null) {
            log.info("Creating new user from social login: {}", email)
            val randomPassword = generateRandomPassword(16)
            val userModel = com.github.shk0da.bioritmic.api.model.user.UserModel(
                name = name,
                email = email,
                password = randomPassword,
                birthday = java.util.Date(),
                gender = null
            )
            user = userService.createNewUser(userModel)
        }
        val auth = authService.createNewAuth(user)
        log.debug("Social login auth created for user: {}", user.id)
        return UserToken.of(user, auth)
    }

    private fun decodeJwtPayload(token: String): Map<String, Any> {
        val parts = token.split(".")
        require(parts.size >= 2) { "Invalid JWT token" }
        val payload = String(Base64.getUrlDecoder().decode(parts[1]))
        @Suppress("UNCHECKED_CAST")
        return com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, Map::class.java) as Map<String, Any>
    }
}
