package com.github.shk0da.bioritmic.api.configuration

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app")
data class AppSecurityProperties(
    val baseUrl: String = "http://localhost:8080",
    val frontendUrl: String = "http://localhost:4200",
    val cors: Cors = Cors(),
    val security: Security = Security()
) {
    data class Cors(
        val allowedOrigins: List<String> = listOf("http://localhost:4200")
    )

    data class Security(
        val cookies: Cookies = Cookies(),
        val loginLockout: LoginLockout = LoginLockout(),
        val adminEmail: String = ""
    ) {
        data class Cookies(
            val secure: Boolean = false
        )

        data class LoginLockout(
            val maxAttempts: Int = 5,
            val lockMinutes: Long = 15
        )
    }
}
