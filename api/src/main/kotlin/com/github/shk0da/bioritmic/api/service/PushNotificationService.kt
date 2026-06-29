package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.UserPushToken
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.repository.UserPushTokenRepository
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingException
import com.google.firebase.messaging.Message
import com.google.firebase.messaging.Notification
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Service
class PushNotificationService(
    private val userPushTokenRepository: UserPushTokenRepository
) {

    private val log = LoggerFactory.getLogger(PushNotificationService::class.java)

    @Transactional
    suspend fun registerToken(userId: UUID, token: String, platform: String) {
        val existing = userPushTokenRepository.findByToken(token)
        if (existing != null) {
            existing.userId = userId
            existing.platform = platform
            userPushTokenRepository.save(existing)
            return
        }

        val pushToken = UserPushToken()
        pushToken.userId = userId
        pushToken.token = token
        pushToken.platform = platform
        pushToken.createdAt = Timestamp(System.currentTimeMillis())

        userPushTokenRepository.save(pushToken)
        log.debug("Push token registered for userId: {} platform: {}", userId, platform)
    }

    @Transactional
    suspend fun removeToken(userId: UUID, token: String) {
        val existing = userPushTokenRepository.findByToken(token)
        if (existing != null && existing.userId != userId) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        userPushTokenRepository.deleteByToken(token)
    }

    @Transactional
    suspend fun removeAllTokens(userId: UUID) {
        userPushTokenRepository.deleteAllByUserId(userId)
        log.debug("All push tokens removed for userId: {}", userId)
    }

    suspend fun sendPushNotification(
        userId: UUID, title: String, body: String,
        data: Map<String, String> = emptyMap()
    ) {
        if (!isFirebaseInitialized()) {
            log.debug("Firebase not initialized, skipping push notification")
            return
        }

        val tokens = userPushTokenRepository.findAllByUserId(userId)
        if (tokens.isEmpty()) {
            log.debug("No push tokens found for userId: {}", userId)
            return
        }

        tokens.forEach { pushToken ->
            try {
                val message = Message.builder()
                    .setToken(pushToken.token)
                    .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                    .putAllData(data)
                    .build()

                FirebaseMessaging.getInstance().send(message)
                log.debug("Push notification sent to userId: {} platform: {}", userId, pushToken.platform)
            } catch (e: FirebaseMessagingException) {
                log.error("Failed to send push notification to token: {} error: {}", pushToken.token, e.message)
                if (e.message?.contains("InvalidRegistrationToken") == true ||
                    e.message?.contains("RegistrationTokenNotRegistered") == true) {
                    userPushTokenRepository.deleteByToken(pushToken.token)
                }
            }
        }
    }

    suspend fun notifyNewMessage(recipientId: UUID, senderName: String, preview: String) {
        val body = if (preview.length > 80) preview.take(80) + "…" else preview
        sendPushNotification(
            recipientId,
            "Новое сообщение",
            "$senderName: $body",
            mapOf("type" to "mailbox")
        )
    }

    suspend fun notifyNewMeeting(recipientId: UUID, senderName: String) {
        sendPushNotification(
            recipientId,
            "Новая встреча",
            "$senderName предлагает встретиться",
            mapOf("type" to "meeting")
        )
    }

    private fun isFirebaseInitialized(): Boolean {
        return try {
            FirebaseApp.getInstance()
            true
        } catch (@Suppress("SwallowedException") e: IllegalStateException) {
            false
        }
    }
}
