package com.github.shk0da.bioritmic.api.controller.synchronization

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.UserInfo
import com.github.shk0da.bioritmic.api.model.UserInfo.Companion.ofWithCompare
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Flux
import java.sql.Timestamp

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/sync")
class SyncController(val userService: UserService) {

    private val log = LoggerFactory.getLogger(SyncController::class.java)

    // GET /synchronization -> timestamp
    @GetMapping(params = ["timestamp"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun sync(timestamp: Long): Flux<UserInfo> {
        val userId = getUserId()
        return userService.findUserByIdWithSettings(userId)
                .map { UserSearch.of(it).withTimestamp(Timestamp(timestamp)) }
                .map { search ->
                    log.debug("Sync: {}", search)
                    userService.searchByFilter(search).map { gisUser -> ofWithCompare(gisUser, search.birthdate!!) }
                }
                .flatMapMany { it }
    }
}