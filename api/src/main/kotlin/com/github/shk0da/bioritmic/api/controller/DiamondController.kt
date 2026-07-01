package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.DiamondService
import com.github.shk0da.bioritmic.api.service.DiamondTransferResult
import com.github.shk0da.bioritmic.api.service.PaginatedDiamondTransactions
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/diamonds")
class DiamondController(
    private val diamondService: DiamondService,
) {
    private val log = LoggerFactory.getLogger(DiamondController::class.java)

    @GetMapping(value = ["/balance"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getBalance(): DiamondBalanceResponse {
        val userId = getUserId()
        return DiamondBalanceResponse(balance = diamondService.getBalance(userId))
    }

    @GetMapping(value = ["/transactions"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listTransactions(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PaginatedDiamondTransactions {
        val userId = getUserId()
        return diamondService.listTransactions(userId, page, size)
    }

    @PostMapping(value = ["/transfer"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun transfer(@RequestBody request: DiamondTransferRequest): DiamondTransferResult {
        val userId = getUserId()
        log.debug("Diamond transfer requested by {} to {} amount {}", userId, request.toUserId, request.amount)
        return diamondService.transfer(
            fromUserId = userId,
            toUserId = request.toUserId,
            amount = request.amount,
            requireBookmark = request.requireBookmark,
        )
    }

    @PostMapping(value = ["/purchase"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun purchase(): Map<String, String> {
        throw ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Purchases are not available yet")
    }
}

data class DiamondBalanceResponse(
    val balance: Long,
)

data class DiamondTransferRequest(
    val toUserId: UUID,
    val amount: Long,
    val requireBookmark: Boolean = false,
)
