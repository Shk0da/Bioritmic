package com.github.shk0da.bioritmic.api.configuration

import org.springframework.core.env.Environment
import org.springframework.stereotype.Component

@Component
class CorsOriginResolver(
    private val appSecurityProperties: AppSecurityProperties,
    environment: Environment
) {

    private val extraOrigins: String = environment.getProperty("APP_CORS_ALLOWED_ORIGINS").orEmpty()

    fun resolve(): List<String> = buildSet {
        appSecurityProperties.cors.allowedOrigins.forEach { addOrigin(it) }
        addOrigin(appSecurityProperties.frontendUrl)
        addOrigin(appSecurityProperties.baseUrl)
        extraOrigins.split(',').forEach { addOrigin(it) }
    }.toList()

    private fun MutableSet<String>.addOrigin(raw: String?) {
        val normalized = raw?.trim()?.trimEnd('/') ?: return
        if (normalized.isNotEmpty()) {
            add(normalized)
        }
    }
}
