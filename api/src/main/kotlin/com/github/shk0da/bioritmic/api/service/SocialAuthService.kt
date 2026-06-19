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
        val picture = payload["picture"] as? String
        return findOrCreateAndAuth(email, name, picture)
    }

    @Transactional
    suspend fun handleAppleLogin(idToken: String): UserToken {
        val payload = decodeJwtPayload(idToken)
        val email = payload["email"] as? String ?: throw ApiException(ErrorCode.INVALID_PARAMETER)
        val name = payload["name"] as? String ?: email.substringBefore("@")
        return findOrCreateAndAuth(email, name, null)
    }

    private suspend fun findOrCreateAndAuth(email: String, name: String, picture: String?): UserToken {
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
        return try {
            val parts = token.split(".")
            if (parts.size < 2) throw ApiException(ErrorCode.INVALID_PARAMETER)
            val payload = String(Base64.getUrlDecoder().decode(parts[1]))
            @Suppress("UNCHECKED_CAST")
            com.fasterxml.jackson.databind.ObjectMapper().readValue(payload, Map::class.java) as Map<String, Any>
        } catch (e: ApiException) {
            throw e
        } catch (e: Exception) {
            log.error("Failed to decode JWT payload", e)
            throw ApiException(ErrorCode.INVALID_PARAMETER)
        }
    }
}
