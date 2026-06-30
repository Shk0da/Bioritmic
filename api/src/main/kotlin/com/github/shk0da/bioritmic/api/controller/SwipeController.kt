package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.SwipeActionService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/swipe")
class SwipeController(
    private val swipeActionService: SwipeActionService,
) {

    @PostMapping(value = ["/{userId}/skip"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun skip(@PathVariable userId: UUID): Map<String, Boolean> {
        val currentUserId = getUserId()
        swipeActionService.skipUser(currentUserId, userId)
        return mapOf("success" to true)
    }
}
