package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.BoostService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.sql.Timestamp

@RestController
@RequestMapping(ApiRoutes.API_WITH_VERSION_1 + "/boost")
class BoostController(
    val boostService: BoostService
) {

    private val log = LoggerFactory.getLogger(BoostController::class.java)

    @PostMapping(value = ["/activate"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun activateBoost(): Map<String, Any> {
        val userId = getUserId()
        val boost = try {
            boostService.activateBoost(userId)
        } catch (ex: IllegalArgumentException) {
            throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only Pro users can activate profile boost."
            )
        }
        return mapOf(
            "success" to true,
            "expiresAt" to (boost.expiresAt?.time ?: 0L)
        )
    }

    @GetMapping(value = ["/current"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getCurrentBoost(): BoostInfoResponse? {
        val userId = getUserId()
        val boost = boostService.getActiveBoost(userId) ?: return null
        return BoostInfoResponse(
            startedAt = boost.startedAt?.time ?: 0L,
            expiresAt = boost.expiresAt?.time ?: 0L
        )
    }
}

data class BoostInfoResponse(
    val startedAt: Long,
    val expiresAt: Long
)
