package com.github.shk0da.bioritmic.api.configuration

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import jakarta.annotation.PostConstruct
import java.io.ByteArrayInputStream

@Configuration
class FirebaseConfiguration {

    private val log = LoggerFactory.getLogger(FirebaseConfiguration::class.java)

    @Value("\${firebase.credentials-base64:}")
    private lateinit var credentialsBase64: String

    @Value("\${firebase.enabled:false}")
    private var enabled: Boolean = false

    @PostConstruct
    fun init() {
        if (!enabled) {
            log.info("Firebase is disabled (firebase.enabled=false)")
            return
        }

        try {
            val credentialsBytes = java.util.Base64.getDecoder().decode(credentialsBase64)
            val credentials = GoogleCredentials.fromStream(ByteArrayInputStream(credentialsBytes))

            val options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build()

            FirebaseApp.initializeApp(options)
            log.info("Firebase initialized successfully")
        } catch (@Suppress("TooGenericExceptionCaught") e: Exception) {
            log.error("Failed to initialize Firebase: {}", e.message)
        }
    }
}
