package com.github.shk0da.bioritmic.api.controller.search

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserInfo.Companion.ofWithCompare
import com.github.shk0da.bioritmic.api.service.SearchService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.security.Principal
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/search")
class SearchController(val userService: UserService, val searchService: SearchService) {

    private val log = LoggerFactory.getLogger(SearchController::class.java)

    // GET /search/ <- List of Users of user settings search
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun search(): List<UserInfo> {
        val userId = getUserId()
        val search = UserSearch.of(userService.findUserByIdWithSettings(userId))
        log.debug("User search: {}", search)
        return searchService.searchByFilter(search).map { gisUser -> ofWithCompare(gisUser, search.birthdate!!) }
    }

    // POST /search/ <- List of Users around with custom search
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun search(@RequestBody @Valid userSearch: UserSearch, principal: Principal): List<UserInfo> {
        userSearch.validate()
        val userId = getUserId(principal)
        val search = userSearch.withUser(userService.findUserById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND))
        log.debug("User search: {}", search)
        return searchService.searchByFilter(search).map { gisUser -> ofWithCompare(gisUser, search.birthdate!!) }
    }
}
