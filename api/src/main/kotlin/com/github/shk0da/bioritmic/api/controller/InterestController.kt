package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.model.user.InterestModel
import com.github.shk0da.bioritmic.api.service.InterestService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class InterestController(
    private val interestService: InterestService
) {

    private val log = LoggerFactory.getLogger(InterestController::class.java)

    @GetMapping(value = ["/interests"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getAllInterests(): List<InterestModel> {
        return interestService.getAllInterests().map { InterestModel.of(it) }
    }

    @GetMapping(value = ["/me/interests"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getUserInterests(): List<InterestModel> {
        val userId = getUserId()
        return interestService.getUserInterests(userId).map { InterestModel.of(it) }
    }

    @PutMapping(value = ["/me/interests"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun setUserInterests(@RequestBody interestIds: List<Long>): List<InterestModel> {
        val userId = getUserId()
        log.debug("Setting {} interests for userId: {}", interestIds.size, userId)
        return interestService.setUserInterests(userId, interestIds).map { InterestModel.of(it) }
    }
}
