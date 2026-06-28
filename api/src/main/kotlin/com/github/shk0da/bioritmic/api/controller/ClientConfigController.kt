package com.github.shk0da.bioritmic.api.controller

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_WITH_VERSION_1 + "/config")
class ClientConfigController(
    @Value("\${firebase.enabled:false}") private val firebaseEnabled: Boolean,
    @Value("\${firebase.web.api-key:}") private val firebaseApiKey: String,
    @Value("\${firebase.web.auth-domain:}") private val firebaseAuthDomain: String,
    @Value("\${firebase.web.project-id:}") private val firebaseProjectId: String,
    @Value("\${firebase.web.storage-bucket:}") private val firebaseStorageBucket: String,
    @Value("\${firebase.web.messaging-sender-id:}") private val firebaseMessagingSenderId: String,
    @Value("\${firebase.web.app-id:}") private val firebaseAppId: String,
    @Value("\${firebase.web.vapid-key:}") private val firebaseVapidKey: String,
) {

    @GetMapping(value = ["/client"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun clientConfig(): Map<String, Any> {
        val webEnabled = firebaseEnabled && firebaseApiKey.isNotBlank() && firebaseVapidKey.isNotBlank()
        return mapOf(
            "firebase" to mapOf(
                "enabled" to webEnabled,
                "apiKey" to firebaseApiKey,
                "authDomain" to firebaseAuthDomain,
                "projectId" to firebaseProjectId,
                "storageBucket" to firebaseStorageBucket,
                "messagingSenderId" to firebaseMessagingSenderId,
                "appId" to firebaseAppId,
                "vapidKey" to firebaseVapidKey,
            )
        )
    }
}
