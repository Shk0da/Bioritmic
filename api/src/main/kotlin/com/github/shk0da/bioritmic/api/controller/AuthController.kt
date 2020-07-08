package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.service.AuthService
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType.APPLICATION_JSON_VALUE
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Mono

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1)
class AuthController(val authService: AuthService) {

    private val log = LoggerFactory.getLogger(AuthController::class.java)

    //   POST /registration/ {name, email}  -> send email with approve
    //   POST /recovery/ {email} -> send email with code
    //   POST /authorization/ {email, password} <- Oauth (JWT, refresh token)

    @PostMapping(value = ["/registration"], produces = [APPLICATION_JSON_VALUE])
    fun registration(userModel: UserModel?): Mono<ResponseEntity<Any>> {
        if (null != userModel) {
            val user: User = authService.createNewUser(userModel)
            log.info("Created new {}", user)
        }
        return Mono.just(ResponseEntity.status(HttpStatus.CREATED).build())
    }
}
