package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.domain.UserPushToken
import com.github.shk0da.bioritmic.api.model.user.PushTokenRequest
import com.github.shk0da.bioritmic.api.repository.UserPushTokenRepository
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.sql.Timestamp

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class PushTokenController(
    private val userPushTokenRepository: UserPushTokenRepository
) {

    private val log = LoggerFactory.getLogger(PushTokenController::class.java)

    @PostMapping(value = ["/me/push-token"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun registerPushToken(@RequestBody request: PushTokenRequest): Map<String, Any> {
        val userId = getUserId()
        val existing = userPushTokenRepository.findByToken(request.token)
        if (existing == null) {
            val pushToken = UserPushToken()
            pushToken.userId = userId
            pushToken.token = request.token
            pushToken.platform = request.platform
            pushToken.createdAt = Timestamp(System.currentTimeMillis())
            userPushTokenRepository.save(pushToken)
            log.debug("Registered push token for userId: {}", userId)
        }
        return mapOf("success" to true)
    }

    @DeleteMapping(value = ["/me/push-token"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun removePushToken(@RequestBody request: PushTokenRequest): Map<String, Any> {
        userPushTokenRepository.deleteByToken(request.token)
        log.debug("Removed push token: {}", request.token.take(8))
        return mapOf("success" to true)
    }
}
