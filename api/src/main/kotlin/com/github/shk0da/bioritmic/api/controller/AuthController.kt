package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.RecoveryModel
import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.service.AuthService
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType.APPLICATION_JSON_VALUE
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Mono

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1)
class AuthController(val authService: AuthService) {

    private val log = LoggerFactory.getLogger(AuthController::class.java)

    // POST /registration/ {name, email}  -> send email with approve
    @PostMapping(value = ["/registration"], produces = [APPLICATION_JSON_VALUE])
    fun registration(@RequestBody userModel: UserModel): Mono<ResponseEntity<Any>> {
        val user: User = authService.createNewUser(userModel)
        log.info("Created new {}", user)
        return Mono.just(ResponseEntity.status(HttpStatus.CREATED).build())
    }

    // POST /recovery/ {email} -> send email with code
    @PostMapping(value = ["/recovery"], produces = [APPLICATION_JSON_VALUE])
    fun recovery(@RequestBody recoveryModel: RecoveryModel): Mono<ResponseEntity<Any>> {
        return Mono.just(ResponseEntity.status(HttpStatus.OK).build())
    }

    // POST /authorization/ {email, password} <- Oauth (JWT, refresh token)
    @PostMapping(value = ["/authorization"], produces = [APPLICATION_JSON_VALUE])
    fun authorization(@RequestBody authorizationModel: AuthorizationModel): Mono<ResponseEntity<Any>> {
        return Mono.just(ResponseEntity.status(HttpStatus.OK).build())
    }
}
