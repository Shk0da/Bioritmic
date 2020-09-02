package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.*
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.RecoveryModel
import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.model.UserToken
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.google.common.collect.ImmutableMap
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType.APPLICATION_JSON_VALUE
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Mono

@Transactional
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1)
class AuthController(val userService: UserService, val authService: AuthService) {

    private val log = LoggerFactory.getLogger(AuthController::class.java)

    // POST /registration/ {name, email}  -> send email with approve
    @PostMapping(value = ["/registration"], produces = [APPLICATION_JSON_VALUE])
    fun registration(@RequestBody userModel: UserModel): Mono<ResponseEntity<UserModel>> {
        with(userModel) {
            if (!isFilledInput()) throw ApiException(INVALID_PARAMETER, ImmutableMap.of(PARAMETER_NAME, "user"))
            if (userService.isUserExists(userModel)) throw ApiException(USER_EXISTS)
        }
        return userService.createNewUser(userModel)
                .map { UserModel.of(it) }
                .map {
                    log.debug("Created new {}", it)
                    ResponseEntity.status(HttpStatus.CREATED).body(it)
                }
    }

    // POST /recovery/ {email} -> send email with code
    @PostMapping(value = ["/recovery"], produces = [APPLICATION_JSON_VALUE])
    fun recovery(@RequestBody recoveryModel: RecoveryModel): Mono<ResponseEntity<Any>> {
        // TODO create New Password, save it and send email
        return Mono.just(ResponseEntity.status(HttpStatus.OK).build())
    }

    // POST /authorization/ {email, password} <- Oauth (JWT, refresh token)
    @PostMapping(value = ["/authorization"], produces = [APPLICATION_JSON_VALUE])
    fun authorization(@RequestBody authorizationModel: AuthorizationModel): Mono<ResponseEntity<UserToken>> {
        val user = userService.findUser(authorizationModel)
        if (null == user) {
            throw ApiException(USER_NOT_FOUND, ImmutableMap.of(PARAMETER_VALUE, authorizationModel.email))
        }
        if (!passwordEncoder.matches(authorizationModel.password, user.password)) {
            throw ApiException(INVALID_PARAMETER, ImmutableMap.of(PARAMETER_NAME, "password"))
        }
        return authService.createNewAuth(user)
                .map { UserToken.of(user, it) }
                .map {
                    log.debug("Created new {}", it)
                    ResponseEntity.status(HttpStatus.OK).body(it)
                }
    }

    @PostMapping(value = ["/logout"], produces = [APPLICATION_JSON_VALUE])
    fun logout(@RequestBody userToken: UserToken): Mono<Void> {
        val user = userService.findUser(userToken)
        if (null == user) {
            throw ApiException(USER_NOT_FOUND, ImmutableMap.of(PARAMETER_VALUE, userToken.email))
        }
        return authService.deleteAuth(userToken, user)
    }
}
