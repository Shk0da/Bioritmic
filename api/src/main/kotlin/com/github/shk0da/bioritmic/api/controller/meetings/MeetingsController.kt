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
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.security.Principal
import java.util.UUID
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/meetings")
class MeetingsController(val meetingsService: MeetingsService) {

    // GET /meetings/
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meetings(@ParameterObject pageable: Pageable): List<UserMeeting> {
        val userId = getUserId()
        return meetingsService.findAllMeetingsByUserId(userId, of(pageable)).map { UserMeeting.of(it, userId) }
    }

    // POST /meetings/
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meetings(@RequestBody @Valid meetings: List<UserMeeting>, principal: Principal): List<UserMeeting> {
        val userId = getUserId(principal)
        return meetingsService.createMeetings(userId, meetings).map { UserMeeting.of(it, userId) }
    }

    // DELETE /meetings/
    @DeleteMapping(value = ["/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meetings(@PathVariable userId: UUID): List<UserMeeting> {
        val currentUserId = getUserId()
        return meetingsService.deleteMetingWithUserId(currentUserId, userId).map { UserMeeting.of(it, currentUserId) }
    }

    // PUT /meetings/{userId}/decline
    @PutMapping(value = ["/{userId}/decline"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun declineMeeting(@PathVariable userId: UUID): Map<String, Any> {
        val currentUserId = getUserId()
        val meeting = meetingsService.declineMeeting(currentUserId, userId)
        return mapOf(
            "success" to true,
            "status" to (meeting?.status ?: "DECLINED")
        )
    }

    // PUT /meetings/{userId}/accept
    @PutMapping(value = ["/{userId}/accept"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun acceptMeeting(@PathVariable userId: UUID): Map<String, Any> {
        val currentUserId = getUserId()
        val meeting = meetingsService.acceptMeeting(currentUserId, userId)
        return mapOf(
            "success" to true,
            "status" to (meeting?.status ?: "ACCEPTED")
        )
    }
}
