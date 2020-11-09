package com.github.shk0da.bioritmic.api.controller.users

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.GisDataModel
import com.github.shk0da.bioritmic.api.model.UserInfo
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import java.lang.Long.valueOf
import java.security.Principal

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

    // DELETE /me -> send email with approve ??
    @DeleteMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun deleteMe(): Mono<Void> {
        val userId = getUserId()
        return userService.deleteUserById(userId)
    }

    // GET /user/{id} <- UserInfo. id - hash?? of real id
    @GetMapping(value = ["/{id}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun user(@PathVariable id: String): Mono<UserInfo> {
        val userId = valueOf(id)
        return userService.findUserById(userId)
                .map { UserInfo.of(it) }
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.USER_NOT_FOUND)))
    }

    // GET /me/gis <- GIS
    @GetMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun meGis(): Mono<ResponseEntity<GisDataModel>> {
        val userId = getUserId()
        return userService.getGis(userId)
                .map { GisDataModel.of(it) }
                .map {
                    log.debug("User gisData: {}", it)
                    ResponseEntity.status(HttpStatus.OK).body(it)
                }
    }

    // POST /me/gis -> UpdateGIS (+ anti SPAM in radius 100km[param] in hour)
    @PostMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun meSaveGis(@RequestBody gisData: GisDataModel, principal: Principal): Mono<ResponseEntity<GisDataModel>> {
        val userId = getUserId(principal)
        return userService.saveGis(userId, gisData)
                .map {
                    log.debug("New gisData: {}", it)
                    ResponseEntity.status(HttpStatus.OK).body(it)
                }
    }

    // GET /search/ <- List of Users of user settings search
    @GetMapping(value = ["/search"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun search(): Flux<UserInfo> {
        val userId = getUserId()
        return userService.findUserByIdWithSettings(userId)
                .map {
                    val settings = it.userSettings
                    UserSearch(
                            userId = it.id!!,
                            birthdate = it.birthday!!,
                            gender = settings?.gender,
                            ageMin = settings?.ageMin,
                            ageMax = settings?.ageMax,
                    )
                }
                .map {
                    log.debug("User search: {}", it)
                    userService.searchByFilter(it)
                }
                .flatMapMany { it }
                .map { UserInfo.of(it) }
    }
}