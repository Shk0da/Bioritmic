package com.github.shk0da.bioritmic.api.configuration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.mock.env.MockEnvironment

class CorsOriginResolverTest {

    @Test
    fun `should merge yaml origins frontend url base url and env extras`() {
        val properties = AppSecurityProperties(
            baseUrl = "https://api.example.com",
            frontendUrl = "https://bioritmic.ru",
            cors = AppSecurityProperties.Cors(
                allowedOrigins = listOf("https://bioritmic.ru")
            )
        )
        val environment = MockEnvironment().apply {
            setProperty("APP_CORS_ALLOWED_ORIGINS", "https://158.160.194.159,https://bioritmic.ru/")
        }

        val origins = CorsOriginResolver(properties, environment).resolve()

        assertEquals(3, origins.size)
        assertTrue(origins.contains("https://bioritmic.ru"))
        assertTrue(origins.contains("https://api.example.com"))
        assertTrue(origins.contains("https://158.160.194.159"))
    }
}
