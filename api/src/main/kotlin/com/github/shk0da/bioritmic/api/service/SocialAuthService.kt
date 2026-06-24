package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.generateRandomPassword
import org.slf4j.LoggerFactory
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SocialAuthService(
    val userService: UserService,
    val authService: AuthService,
    val googleJwtDecoder: JwtDecoder,
    val appleJwtDecoder: JwtDecoder
) {

    private val log = LoggerFactory.getLogger(SocialAuthService::class.java)

    @Suppress("UNCHECKED_CAST")
    @Transactional
    suspend fun handleGoogleLogin(idToken: String): UserToken {
        val jwt = verifyJwt(idToken, googleJwtDecoder, "google")
        val email = jwt.subject ?: throw ApiException(ErrorCode.INVALID_PARAMETER)
        val name = jwt.getClaim("name") as? String
            ?: jwt.getClaim("given_name") as? String
            ?: email.substringBefore("@")
        return findOrCreateAndAuth(email, name)
    }

    @Suppress("UNCHECKED_CAST")
    @Transactional
    suspend fun handleAppleLogin(idToken: String): UserToken {
        val jwt = verifyJwt(idToken, appleJwtDecoder, "apple")
        // Apple email is in the "email" claim
        val email = jwt.getClaim("email") as? String
            ?: jwt.subject ?: throw ApiException(ErrorCode.INVALID_PARAMETER)
        val name = jwt.getClaim("name") as? String ?: email.substringBefore("@")
        return findOrCreateAndAuth(email, name)
    }

    private fun verifyJwt(
        idToken: String,
        decoder: JwtDecoder,
        provider: String
    ): Jwt {
        return try {
            decoder.decode(idToken)
        } catch (e: JwtException) {
            log.warn("Invalid {} ID token: {}", provider, e.message)
            throw ApiException(ErrorCode.INVALID_PARAMETER)
        }
    }

    private suspend fun findOrCreateAndAuth(email: String, name: String): UserToken {
        var user = userService.findUserByEmail(email)
        if (user == null) {
            log.info("Creating new user from social login: {}", email)
            val randomPassword = generateRandomPassword(16)
            val userModel = UserModel(
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
}
