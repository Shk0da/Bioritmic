package com.github.shk0da.bioritmic.api.controller.meetings

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.service.MeetingsService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springdoc.core.annotations.ParameterObject
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import java.security.Principal
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/meetings")
class MeetingsController(val meetingsService: MeetingsService) {

    // GET /meetings/
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meetings(@ParameterObject pageable: Pageable): List<UserMeeting> {
        val userId = getUserId()
        return meetingsService.findAllMeetingsByUserId(userId, of(pageable)).map { UserMeeting.of(it) }
    }

    // POST /meetings/
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meetings(@RequestBody @Valid meetings: List<UserMeeting>, principal: Principal): List<UserMeeting> {
        val userId = getUserId(principal)
        return meetingsService.createMeetings(userId, meetings).map { UserMeeting.of(it) }
    }

    // DELETE /meetings/
    @DeleteMapping(value = ["/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meetings(@PathVariable userId: Long): List<UserMeeting> {
        val currentUserId = getUserId()
        return meetingsService.deleteMetingWithUserId(currentUserId, userId).map { UserMeeting.of(it) }
    }
}
