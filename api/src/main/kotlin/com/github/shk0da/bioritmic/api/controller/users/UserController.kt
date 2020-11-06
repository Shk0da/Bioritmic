package com.github.shk0da.bioritmic.api.controller.users

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.UserInfo
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Mono

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class UserController(val userService: UserService) {

    private val log = LoggerFactory.getLogger(UserController::class.java)

    // GET /me <- UserInfo
    @GetMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun me(): Mono<UserInfo> {
        val userId = getUserId()
        return userService.findUserById(userId).map { UserInfo.of(it) }
    }
}