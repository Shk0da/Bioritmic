package com.github.shk0da.bioritmic.api.controller.meetings

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.service.MeetingsService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import io.swagger.annotations.ApiImplicitParam
import io.swagger.annotations.ApiImplicitParams
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import java.security.Principal
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/meetings")
class MeetingsController(val meetingsService: MeetingsService) {

    // GET /meetings/
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    @ApiImplicitParams(value = [
        ApiImplicitParam(name = "page", dataType = "java.lang.Integer", paramType = "query"),
        ApiImplicitParam(name = "size", dataType = "java.lang.Integer", paramType = "query")
    ])
    fun meetings(pageable: Pageable): Flux<UserMeeting> {
        val userId = getUserId()
        return meetingsService.findAllMeetingsByUserId(userId, of(pageable)).map { UserMeeting.of(it) }
    }

    // POST /meetings/
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun meetings(@RequestBody @Valid meetings: Flux<UserMeeting>, principal: Principal): Flux<UserMeeting> {
        val userId = getUserId(principal)
        return meetingsService.createMeetings(userId, meetings).map { UserMeeting.of(it) }
    }

    // DELETE /meetings/
    @DeleteMapping(value = ["/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun meetings(@PathVariable userId: Long): Flux<UserMeeting> {
        val currentUserId = getUserId()
        return meetingsService.deleteMetingWithUserId(currentUserId, userId).map { UserMeeting.of(it) }
    }
}