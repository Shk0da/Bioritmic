package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.*
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.RecoveryModel
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import io.swagger.annotations.ApiImplicitParam
import io.swagger.annotations.ApiImplicitParams
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType.APPLICATION_JSON_VALUE
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Mono
import javax.validation.Valid
import javax.validation.constraints.NotEmpty

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1)
class AuthController(val userService: UserService, val authService: AuthService) {

    private val log = LoggerFactory.getLogger(AuthController::class.java)

    // POST /registration/ {name, email}  -> send email with approve
    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping(value = ["/registration"], produces = [APPLICATION_JSON_VALUE])
    fun registration(@RequestBody @Valid userModel: UserModel): Mono<ResponseEntity<UserModel>> {
        with(userModel) {
            if (!isFilledInput()) throw ApiException(INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "user")))
            if (userService.isUserExists(userModel.email)) throw ApiException(USER_EXISTS)
        }
        return userService.createNewUser(userModel)
                .map { UserModel.of(it) }
                .map {
                    log.debug("Created new {}", it)
                    ResponseEntity.status(HttpStatus.CREATED).body(it)
                }
    }

    // POST /recovery/ {email} -> send email with code
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/recovery"], produces = [APPLICATION_JSON_VALUE])
    fun recovery(@RequestBody @Valid recoveryModel: RecoveryModel): Mono<ResponseEntity<Any>> {
        val user = userService.findUserByEmail(recoveryModel.email)
        if (null == user) {
            throw ApiException(USER_WITH_EMAIL_NOT_FOUND, mapOf(Pair(PARAMETER_VALUE, recoveryModel.email)))
        }
        return authService.sendRecoveryEmail(user)
                .map {
                    log.debug("Recovery User: {}", user)
                    ResponseEntity.status(HttpStatus.OK).build()
                }
    }

    // GET /recovery/ ?{code} <- validate code and reset password
    @ResponseStatus(HttpStatus.OK)
    @GetMapping(value = ["/reset-password"], produces = [APPLICATION_JSON_VALUE])
    @ApiImplicitParams(value = [
        ApiImplicitParam(name = "code", dataType = "java.lang.String", paramType = "query")
    ])
    fun resetPassword(@RequestParam @Valid @NotEmpty code: String): Mono<ResponseEntity<Any>> {
        val user = authService.findUserByRecoveryCode(code) ?: throw ApiException(INVALID_RECOVERY_CODE)
        if (null == user.recoveryCodeExpireTime && user.recoveryCodeExpireTime!!.time < System.currentTimeMillis()) {
            throw ApiException(INVALID_RECOVERY_CODE)
        }
        return authService.resetPasswordAndSendEmail(user)
                .map {
                    log.debug("Reset password for: {}", user)
                    ResponseEntity.status(HttpStatus.OK).build()
                }
    }

    // GET /update-email?code=$code&email=$newEmail
    @GetMapping(value = ["/update-email"], produces = [APPLICATION_JSON_VALUE])
    @ApiImplicitParams(value = [
        ApiImplicitParam(name = "code", dataType = "java.lang.String", paramType = "query"),
        ApiImplicitParam(name = "email", dataType = "java.lang.String", paramType = "query")
    ])
    fun updateEmail(@Valid @NotEmpty code: String, @Valid @NotEmpty email: String): Mono<ResponseEntity<Any>> {
        val user = authService.findUserByRecoveryCode(code) ?: throw ApiException(INVALID_RECOVERY_CODE)
        if (null == user.recoveryCodeExpireTime && user.recoveryCodeExpireTime!!.time < System.currentTimeMillis()) {
            throw ApiException(INVALID_RECOVERY_CODE)
        }
        return userService.updateEmail(user, email)
                .map {
                    log.debug("New email for: {}", user)
                    ResponseEntity.status(HttpStatus.OK).build()
                }
    }

    // POST /authorization/ {email, password} <- Oauth (JWT, refresh token)
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/authorization"], produces = [APPLICATION_JSON_VALUE])
    fun authorization(@RequestBody @Valid authorizationModel: AuthorizationModel): Mono<ResponseEntity<UserToken>> {
        val user = userService.findUserByEmail(authorizationModel.email)
        if (null == user) {
            throw ApiException(USER_WITH_EMAIL_NOT_FOUND, mapOf(Pair(PARAMETER_VALUE, authorizationModel.email)))
        }
        if (!passwordEncoder.matches(authorizationModel.password, user.password)) {
            throw ApiException(INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "password")))
        }
        return authService.createNewAuth(user)
                .map { UserToken.of(user, it) }
                .map {
                    log.debug("Created new {}", it)
                    ResponseEntity.status(HttpStatus.OK).body(it)
                }
    }

    // POST /refresh-token/ <- {email, refreshToken} -> new accesToken
    @ResponseStatus(HttpStatus.OK)
    @PostMapping(value = ["/refresh-token"], produces = [APPLICATION_JSON_VALUE])
    fun refreshToken(@RequestBody @Valid userToken: UserToken): Mono<ResponseEntity<UserToken>> {
        return authService.refreshToken(userToken)
                .map {
                    log.debug("Refreshed {}", it)
                    ResponseEntity.status(HttpStatus.OK).body(it)
                }
    }

    // POST /logout -> clear token
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @DeleteMapping(value = ["/logout"], produces = [APPLICATION_JSON_VALUE])
    fun logout(): Mono<ResponseEntity<Void>> {
        val userId = getUserId()
        return authService.deleteAuthByUserId(userId)
                .map {
                    log.debug("Delete User with ID: {}", userId)
                    ResponseEntity.status(HttpStatus.NO_CONTENT).build()
                }
    }
}
