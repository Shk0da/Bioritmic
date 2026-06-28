package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.configuration.AppSecurityProperties
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.INVALID_PARAMETER
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.INVALID_RECOVERY_CODE
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.USER_EXISTS
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.USER_WITH_EMAIL_NOT_FOUND
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.RecoveryModel
import com.github.shk0da.bioritmic.api.model.ResetPasswordRequest
import com.github.shk0da.bioritmic.api.model.VerifyEmailRequest
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.LoginLockoutService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_USER
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.utils.AuthCookieHelper
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.PasswordValidator
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType.APPLICATION_JSON_VALUE
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ServerWebExchange
import javax.validation.Valid
import javax.validation.constraints.NotEmpty

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1)
class AuthController(
    val userService: UserService,
    val authService: AuthService,
    val userRoleRepository: UserRoleRepository,
    val userRepository: UserRepository,
    val loginLockoutService: LoginLockoutService,
    val appSecurityProperties: AppSecurityProperties
) {

    private val log = LoggerFactory.getLogger(AuthController::class.java)

    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping(value = ["/registration"], produces = [APPLICATION_JSON_VALUE])
    suspend fun registration(@RequestBody @Valid userModel: UserModel): ResponseEntity<UserModel> {
        with(userModel) {
            if (!isFilledInput()) throw ApiException(INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "user")))
            PasswordValidator.validate(password)
            if (userService.isUserExists(userModel.email)) throw ApiException(USER_EXISTS)
        }
        val assignFirstUserAdmin = appSecurityProperties.security.adminEmail.isBlank() &&
            userRepository.countAll() == 0L
        val newUser = UserModel.of(userService.createNewUser(userModel))
        val userId = newUser.id ?: throw ApiException(INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "user")))

        val adminEmail = appSecurityProperties.security.adminEmail
        val autoVerified = when {
            adminEmail.isNotBlank() && newUser.email.equals(adminEmail, ignoreCase = true) -> {
                userRoleRepository.addRole(userId, ROLE_ADMIN)
                userRepository.setVerified(userId, true)
                log.info("User {} assigned ADMIN role (configured admin email)", userId)
                true
            }
            assignFirstUserAdmin -> {
                userRoleRepository.addRole(userId, ROLE_ADMIN)
                userRepository.setVerified(userId, true)
                log.info("User {} assigned ADMIN role (first user)", userId)
                true
            }
            else -> {
                userRoleRepository.addRole(userId, ROLE_USER)
                false
            }
        }

        if (!autoVerified) {
            try {
                authService.sendVerificationEmail(userId)
            } catch (ex: Exception) {
                log.error("Failed to send verification email for user {}", userId, ex)
            }
        }

        log.debug("Created new {}", newUser)
        return ResponseEntity.status(HttpStatus.CREATED).body(newUser)
    }

    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/recovery"], produces = [APPLICATION_JSON_VALUE])
    suspend fun recovery(@RequestBody @Valid recoveryModel: RecoveryModel) {
        val user = userService.findUserByEmail(recoveryModel.email)
        if (user != null) {
            log.debug("Recovery User: {}", user)
            authService.sendRecoveryEmail(user)
        }
    }

    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/reset-password"], produces = [APPLICATION_JSON_VALUE])
    suspend fun resetPassword(@RequestBody @Valid request: ResetPasswordRequest) {
        authService.resetPasswordWithCode(request.code, request.password)
    }

    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/verify-email"], produces = [APPLICATION_JSON_VALUE])
    suspend fun verifyEmail(@RequestBody @Valid request: VerifyEmailRequest) {
        authService.verifyEmailWithCode(request.code)
    }

    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/verify-email/resend"], produces = [APPLICATION_JSON_VALUE])
    suspend fun resendVerificationEmail() {
        val userId = getUserId()
        authService.sendVerificationEmail(userId)
    }

    @GetMapping(value = ["/update-email"], produces = [APPLICATION_JSON_VALUE])
    suspend fun updateEmail(@Valid @NotEmpty code: String, @Valid @NotEmpty email: String) {
        val user = authService.findUserByRecoveryCode(code) ?: throw ApiException(INVALID_RECOVERY_CODE)
        if (user.recoveryCodeExpireTime == null || user.recoveryCodeExpireTime!!.time < System.currentTimeMillis()) {
            throw ApiException(INVALID_RECOVERY_CODE)
        }
        log.debug("New email for: {}", user)
        userService.updateEmail(user, email)
    }

    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/authorization"], produces = [APPLICATION_JSON_VALUE])
    suspend fun authorization(@RequestBody @Valid authorizationModel: AuthorizationModel): ResponseEntity<UserToken> {
        val user = userService.findUserByEmail(authorizationModel.email)
        if (null == user || user.id == null) {
            throw ApiException(USER_WITH_EMAIL_NOT_FOUND, mapOf(Pair(PARAMETER_VALUE, authorizationModel.email)))
        }
        loginLockoutService.ensureNotLocked(user.id!!)
        if (!passwordEncoder.matches(authorizationModel.password, user.password)) {
            loginLockoutService.recordFailedLogin(user.id!!)
            throw ApiException(INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "password")))
        }
        loginLockoutService.resetFailedLogins(user.id!!)
        val newAuth = authService.createNewAuth(user)
        log.debug("Created new {}", newAuth)
        return authResponse(UserToken.of(user, newAuth))
    }

    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/refresh-token"], produces = [APPLICATION_JSON_VALUE])
    suspend fun refreshToken(
        @RequestBody @Valid userToken: UserToken,
        exchange: ServerWebExchange
    ): ResponseEntity<UserToken> {
        val cookieRefresh = exchange.request.cookies.getFirst(AuthCookieHelper.REFRESH_TOKEN)?.value
        val token = userToken.copy(refreshToken = cookieRefresh ?: userToken.refreshToken)
        log.debug("Refreshed {}", token.email)
        return authResponse(authService.refreshToken(token))
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequestMapping(
        value = ["/logout"],
        method = [RequestMethod.POST, RequestMethod.DELETE],
        produces = [APPLICATION_JSON_VALUE]
    )
    suspend fun logout(exchange: ServerWebExchange): ResponseEntity<Void> {
        resolveAccessToken(exchange)?.let { token ->
            authService.deleteAuthByAccessToken(token)
            log.debug("Logged out session ending with {}", token.takeLast(8))
        }
        return clearAuthCookies()
    }

    private fun resolveAccessToken(exchange: ServerWebExchange): String? {
        exchange.request.cookies.getFirst(AuthCookieHelper.ACCESS_TOKEN)?.value?.let { return it }
        val bearer = "Bearer "
        val header = exchange.request.headers.getFirst(HttpHeaders.AUTHORIZATION) ?: return null
        if (header.length > bearer.length && header.startsWith(bearer)) {
            return header.substring(bearer.length)
        }
        return null
    }

    private fun authResponse(userToken: UserToken): ResponseEntity<UserToken> {
        val secure = AuthCookieHelper.isSecureCookies(appSecurityProperties)
        val maxAge = AuthCookieHelper.cookieMaxAgeSeconds()
        return ResponseEntity.ok()
            .header(
                HttpHeaders.SET_COOKIE,
                AuthCookieHelper.accessTokenCookie(userToken.accessToken!!, maxAge, secure).toString()
            )
            .header(
                HttpHeaders.SET_COOKIE,
                AuthCookieHelper.refreshTokenCookie(userToken.refreshToken!!, maxAge, secure).toString()
            )
            .body(userToken)
    }

    private fun clearAuthCookies(): ResponseEntity<Void> {
        val secure = AuthCookieHelper.isSecureCookies(appSecurityProperties)
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, AuthCookieHelper.clearAccessToken(secure).toString())
            .header(HttpHeaders.SET_COOKIE, AuthCookieHelper.clearRefreshToken(secure).toString())
            .build()
    }
}
