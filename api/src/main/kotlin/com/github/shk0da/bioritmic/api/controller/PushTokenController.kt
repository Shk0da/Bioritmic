package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.model.user.PushTokenRequest
import com.github.shk0da.bioritmic.api.service.PushNotificationService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class PushTokenController(
    private val pushNotificationService: PushNotificationService
) {

    private val log = LoggerFactory.getLogger(PushTokenController::class.java)

    private companion object {
        private const val TOKEN_PREFIX_LENGTH = 8
    }

    @PostMapping(value = ["/me/push-token"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun registerPushToken(@RequestBody request: PushTokenRequest): Map<String, Any> {
        val userId = getUserId()
        pushNotificationService.registerToken(userId, request.token, request.platform)
        log.debug("Registered push token for userId: {}", userId)
        return mapOf("success" to true)
    }

    @DeleteMapping(value = ["/me/push-token"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun removePushToken(@RequestParam(required = false) token: String?): Map<String, Any> {
        val userId = getUserId()
        if (token.isNullOrBlank()) {
            pushNotificationService.removeAllTokens(userId)
            log.debug("Removed all push tokens for userId: {}", userId)
        } else {
            pushNotificationService.removeToken(userId, token)
            log.debug("Removed push token: {}", token.take(TOKEN_PREFIX_LENGTH))
        }
        return mapOf("success" to true)
    }
}
