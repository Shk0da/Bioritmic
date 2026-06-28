package com.github.shk0da.bioritmic.api.configuration

import org.springframework.core.env.Environment
import org.springframework.stereotype.Component

@Component
class CorsOriginResolver(
    private val appSecurityProperties: AppSecurityProperties,
    environment: Environment
) {

    private val extraOrigins: String = environment.getProperty("APP_CORS_ALLOWED_ORIGINS").orEmpty()
    private val sslPublicIp: String = environment.getProperty("SSL_PUBLIC_IP").orEmpty()
    private val sslDomain: String = environment.getProperty("SSL_DOMAIN").orEmpty()
    private val sslExtraDomains: String = environment.getProperty("SSL_EXTRA_DOMAINS").orEmpty()

    fun resolve(): List<String> = buildSet {
        appSecurityProperties.cors.allowedOrigins.forEach { addOrigin(it) }
        addOrigin(appSecurityProperties.frontendUrl)
        addOrigin(appSecurityProperties.baseUrl)
        extraOrigins.split(',').forEach { addOrigin(it) }
        addOriginForHost(sslPublicIp)
        addOriginForHost(sslDomain)
        sslExtraDomains.split(',').forEach { addOriginForHost(it) }
    }.toList()

    private fun MutableSet<String>.addOrigin(raw: String?) {
        val normalized = raw?.trim()?.trimEnd('/') ?: return
        if (normalized.isNotEmpty()) {
            add(normalized)
        }
    }

    private fun MutableSet<String>.addOriginForHost(host: String?) {
        val normalized = host?.trim()?.trimEnd('/') ?: return
        if (normalized.isEmpty()) {
            return
        }
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
            addOrigin(normalized)
            return
        }
        addOrigin("https://$normalized")
        addOrigin("http://$normalized")
    }
}
