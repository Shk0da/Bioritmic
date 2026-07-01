package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.BoostService
import com.github.shk0da.bioritmic.api.service.DiamondService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_WITH_VERSION_1 + "/boost")
class BoostController(
    val boostService: BoostService,
) {

    private val log = LoggerFactory.getLogger(BoostController::class.java)

    @PostMapping(value = ["/activate"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun activateBoost(): Map<String, Any> {
        val userId = getUserId()
        val result = boostService.activateBoost(userId)
        log.debug("Boost activated for userId={}", userId)
        return mapOf(
            "success" to true,
            "expiresAt" to (result.boost.expiresAt?.time ?: 0L),
            "balance" to result.balance,
            "cost" to DiamondService.BOOST_COST,
        )
    }

    @GetMapping(value = ["/current"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getCurrentBoost(): BoostInfoResponse? {
        val userId = getUserId()
        val boost = boostService.getActiveBoost(userId) ?: return null
        return BoostInfoResponse(
            startedAt = boost.startedAt?.time ?: 0L,
            expiresAt = boost.expiresAt?.time ?: 0L,
            cost = DiamondService.BOOST_COST,
        )
    }
}

data class BoostInfoResponse(
    val startedAt: Long,
    val expiresAt: Long,
    val cost: Long = DiamondService.BOOST_COST,
)
