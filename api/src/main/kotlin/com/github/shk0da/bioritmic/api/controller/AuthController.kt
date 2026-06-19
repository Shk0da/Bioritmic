package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.*
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.RecoveryModel
import com.github.shk0da.bioritmic.api.model.SocialLoginRequest
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.SocialAuthService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType.APPLICATION_JSON_VALUE
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import javax.validation.Valid
import javax.validation.constraints.NotEmpty

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1)
class AuthController(val userService: UserService, val authService: AuthService, val socialAuthService: SocialAuthService) {

    private val log = LoggerFactory.getLogger(AuthController::class.java)

    // POST /registration/ {name, email}  -> send email with approve
    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping(value = ["/registration"], produces = [APPLICATION_JSON_VALUE])
    suspend fun registration(@RequestBody @Valid userModel: UserModel): ResponseEntity<UserModel> {
        with(userModel) {
            if (!isFilledInput()) throw ApiException(INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "user")))
            if (userService.isUserExists(userModel.email)) throw ApiException(USER_EXISTS)
        }
        val newUser = UserModel.of(userService.createNewUser(userModel))
        log.debug("Created new {}", newUser)
        return ResponseEntity.status(HttpStatus.CREATED).body(newUser)
    }

    // POST /recovery/ {email} -> send email with code
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/recovery"], produces = [APPLICATION_JSON_VALUE])
    suspend fun recovery(@RequestBody @Valid recoveryModel: RecoveryModel) {
        val user = userService.findUserByEmail(recoveryModel.email) ?: throw ApiException(
            USER_WITH_EMAIL_NOT_FOUND,
            mapOf(Pair(PARAMETER_VALUE, recoveryModel.email))
        )
        log.debug("Recovery User: {}", user)
        return authService.sendRecoveryEmail(user)
    }

    // GET /recovery/ ?{code} <- validate code and reset password
    @ResponseStatus(HttpStatus.OK)
    @GetMapping(value = ["/reset-password"], produces = [APPLICATION_JSON_VALUE])
    suspend fun resetPassword(@RequestParam @Valid @NotEmpty code: String) {
        val user = authService.findUserByRecoveryCode(code) ?: throw ApiException(INVALID_RECOVERY_CODE)
        if (null == user.recoveryCodeExpireTime && user.recoveryCodeExpireTime!!.time < System.currentTimeMillis()) {
            throw ApiException(INVALID_RECOVERY_CODE)
        }
        log.debug("Reset password for: {}", user)
        return authService.resetPasswordAndSendEmail(user)
    }

    // GET /update-email?code=$code&email=$newEmail
    @GetMapping(value = ["/update-email"], produces = [APPLICATION_JSON_VALUE])
    suspend fun updateEmail(@Valid @NotEmpty code: String, @Valid @NotEmpty email: String) {
        val user = authService.findUserByRecoveryCode(code) ?: throw ApiException(INVALID_RECOVERY_CODE)
        if (null == user.recoveryCodeExpireTime && user.recoveryCodeExpireTime!!.time < System.currentTimeMillis()) {
            throw ApiException(INVALID_RECOVERY_CODE)
        }
        log.debug("New email for: {}", user)
        userService.updateEmail(user, email)
    }

    // POST /authorization/ {email, password} <- Oauth (JWT, refresh token)
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/authorization"], produces = [APPLICATION_JSON_VALUE])
    suspend fun authorization(@RequestBody @Valid authorizationModel: AuthorizationModel): UserToken {
        val user = userService.findUserByEmail(authorizationModel.email)
        if (null == user) {
            throw ApiException(USER_WITH_EMAIL_NOT_FOUND, mapOf(Pair(PARAMETER_VALUE, authorizationModel.email)))
        }
        if (!passwordEncoder.matches(authorizationModel.password, user.password)) {
            throw ApiException(INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "password")))
        }
        val newAuth = authService.createNewAuth(user)
        log.debug("Created new {}", newAuth)
        return UserToken.of(user, newAuth)
    }

    // POST /refresh-token/ <- {email, refreshToken} -> new accesToken
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/refresh-token"], produces = [APPLICATION_JSON_VALUE])
    suspend fun refreshToken(@RequestBody @Valid userToken: UserToken): UserToken {
        log.debug("Refreshed {}", userToken)
        return authService.refreshToken(userToken)
    }

    // POST /auth/google <- {idToken} -> UserToken
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/auth/google"], produces = [APPLICATION_JSON_VALUE])
    suspend fun googleLogin(@RequestBody @Valid request: SocialLoginRequest): UserToken {
        log.debug("Google social login")
        return socialAuthService.handleGoogleLogin(request.idToken)
    }

    // POST /auth/apple <- {idToken} -> UserToken
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/auth/apple"], produces = [APPLICATION_JSON_VALUE])
    suspend fun appleLogin(@RequestBody @Valid request: SocialLoginRequest): UserToken {
        log.debug("Apple social login")
        return socialAuthService.handleAppleLogin(request.idToken)
    }

    // POST /logout -> clear token
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @DeleteMapping(value = ["/logout"], produces = [APPLICATION_JSON_VALUE])
    suspend fun logout(): ResponseEntity<Void> {
        val userId = getUserId()
        authService.deleteAuthByUserId(userId)
        log.debug("Delete User with ID: {}", userId)
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build()
    }
}
