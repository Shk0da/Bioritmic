package com.github.shk0da.bioritmic.api.configuration

import org.springframework.core.env.Environment
import org.springframework.http.HttpHeaders
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.stereotype.Component
import java.net.URI

@Component
class CorsOriginResolver(
    private val appSecurityProperties: AppSecurityProperties,
    environment: Environment
) {

    private val extraOrigins: String = environment.getProperty("APP_CORS_ALLOWED_ORIGINS").orEmpty()
    private val sslPublicIp: String = environment.getProperty("SSL_PUBLIC_IP").orEmpty()
    private val sslDomain: String = environment.getProperty("SSL_DOMAIN").orEmpty()
    private val sslExtraDomains: String = environment.getProperty("SSL_EXTRA_DOMAINS").orEmpty()

    fun resolve(request: ServerHttpRequest? = null): List<String> = buildSet {
        addConfiguredOrigins()
        request?.let { req ->
            val origin = req.headers.origin
            val host = req.headers.getFirst(HttpHeaders.HOST)
            if (origin != null && host != null && matchesRequestHost(origin, host)) {
                addOrigin(origin)
            }
        }
    }.toList()

    private fun MutableSet<String>.addConfiguredOrigins() {
        appSecurityProperties.cors.allowedOrigins.forEach { addOrigin(it) }
        addOrigin(appSecurityProperties.frontendUrl)
        addOrigin(appSecurityProperties.baseUrl)
        extraOrigins.split(',').forEach { addOrigin(it) }
        addOriginForHost(sslPublicIp)
        addOriginForHost(sslDomain)
        sslExtraDomains.split(',').forEach { addOriginForHost(it) }
    }

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

    companion object {
        fun matchesRequestHost(origin: String, host: String): Boolean {
            return try {
                val originHost = URI.create(origin).host ?: return false
                val requestHost = host.substringBefore(':')
                originHost.equals(requestHost, ignoreCase = true)
            } catch (_: Exception) {
                false
            }
        }
    }
}
