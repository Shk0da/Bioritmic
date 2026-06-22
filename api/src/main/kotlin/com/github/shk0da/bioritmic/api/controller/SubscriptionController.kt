package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.service.SubscriptionService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.sql.Timestamp
import java.text.SimpleDateFormat
import java.util.*

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/subscription")
class SubscriptionController(
    val subscriptionService: SubscriptionService
) {

    companion object {
        private const val SUBSCRIPTION_DURATION_DAYS = 30
    }

    private val log = LoggerFactory.getLogger(SubscriptionController::class.java)

    @PostMapping(value = ["/verify"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun verifySubscription(@RequestBody request: SubscriptionVerifyRequest): SubscriptionResponse {
        val userId = getUserId()
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_MONTH, SUBSCRIPTION_DURATION_DAYS)
        val expiresAt = Timestamp(calendar.timeInMillis)

        subscriptionService.activatePro(userId, expiresAt)
        log.info("Subscription verified for userId={}, plan={}, expiresAt={}", userId, request.plan, expiresAt)

        return SubscriptionResponse(
            plan = request.plan,
            status = "ACTIVE",
            expiresAt = formatTimestamp(expiresAt)
        )
    }

    @GetMapping(value = ["/current"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getCurrentSubscription(): SubscriptionResponse {
        val userId = getUserId()
        if (subscriptionService.isFreeForAll()) {
            return SubscriptionResponse(plan = "PRO", status = "ACTIVE", expiresAt = null)
        }
        val subscription = subscriptionService.getActiveSubscription(userId)
        return if (subscription != null) {
            SubscriptionResponse(
                plan = subscription.plan,
                status = subscription.status,
                expiresAt = subscription.expiresAt?.let { formatTimestamp(it) }
            )
        } else {
            SubscriptionResponse(plan = "FREE", status = "ACTIVE", expiresAt = null)
        }
    }

    @PostMapping(value = ["/cancel"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun cancelSubscription(): SubscriptionResponse {
        val userId = getUserId()
        subscriptionService.cancelSubscription(userId)
        log.info("Subscription cancelled for userId={}", userId)
        return SubscriptionResponse(plan = "FREE", status = "CANCELLED", expiresAt = null)
    }

    private fun formatTimestamp(timestamp: Timestamp): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss")
        return sdf.format(Date(timestamp.time))
    }
}

data class SubscriptionVerifyRequest(
    val receiptToken: String,
    val plan: String = "PRO"
)

data class SubscriptionResponse(
    val plan: String,
    val status: String,
    val expiresAt: String?
)
