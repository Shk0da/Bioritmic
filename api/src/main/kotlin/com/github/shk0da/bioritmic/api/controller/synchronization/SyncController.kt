package com.github.shk0da.bioritmic.api.controller.synchronization

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
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
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.sql.Timestamp

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/sync")
class SyncController(val userService: UserService, val searchService: SearchService) {

    private val log = LoggerFactory.getLogger(SyncController::class.java)

    @GetMapping(params = ["timestamp"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun sync(@RequestParam("timestamp") timestamp: Long): List<UserInfo> {
        val userId = getUserId()
        val search = UserSearch.of(userService.findUserByIdWithSettings(userId)).withTimestamp(Timestamp(timestamp))
        log.debug("Sync: {}", search)
        val result = searchService.searchByFilter(search)
        return result.map { gisUser -> ofWithCompare(gisUser, search.birthdate!!) }
    }
}
