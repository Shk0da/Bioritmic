package com.github.shk0da.bioritmic.api.controller.search

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserInfo.Companion.ofWithCompare
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import java.security.Principal
import javax.validation.Valid

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/search")
class SearchController(val userService: UserService) {

    private val log = LoggerFactory.getLogger(SearchController::class.java)

    // GET /search/ <- List of Users of user settings search
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun search(): Flux<UserInfo> {
        val userId = getUserId()
        return userService.findUserByIdWithSettings(userId)
                .map { UserSearch.of(it) }
                .map { search ->
                    log.debug("User search: {}", search)
                    userService.searchByFilter(search).map { gisUser -> ofWithCompare(gisUser, search.birthdate!!) }
                }
                .flatMapMany { it }
    }

    // POST /search/ <- List of Users around with custom search
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun search(@Valid @RequestBody userSearch: UserSearch, principal: Principal): Flux<UserInfo> {
        userSearch.validate()
        val userId = getUserId(principal)
        return userService.findUserById(userId)
                .map { userSearch.withUser(it) }
                .map { search ->
                    log.debug("User search: {}", search)
                    userService.searchByFilter(search).map { gisUser -> ofWithCompare(gisUser, search.birthdate!!) }
                }
                .flatMapMany { it }
    }
}