package com.github.shk0da.bioritmic.api.configuration

import org.springframework.http.HttpHeaders
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.stereotype.Component
import org.springframework.web.cors.CorsConfiguration

@Component
class CorsConfigurationFactory(
    private val corsOriginResolver: CorsOriginResolver
) {

    fun create(request: ServerHttpRequest? = null): CorsConfiguration {
        return CorsConfiguration().apply {
            allowedOrigins = corsOriginResolver.resolve(request)
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
            allowedHeaders = listOf("*")
            exposedHeaders = listOf(HttpHeaders.SET_COOKIE)
            maxAge = CORS_MAX_AGE_SECONDS
            allowCredentials = true
        }
    }

    companion object {
        private const val CORS_MAX_AGE_SECONDS = 3600L
    }
}
