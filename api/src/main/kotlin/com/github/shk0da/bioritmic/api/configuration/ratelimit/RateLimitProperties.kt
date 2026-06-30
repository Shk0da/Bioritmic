package com.github.shk0da.bioritmic.api.configuration.ratelimit

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "rate-limit")
data class RateLimitProperties(
    val enabled: Boolean = true,
    val publicAuth: Bucket = Bucket(maxRequests = 20, windowSeconds = 60),
    val globalIp: Bucket = Bucket(maxRequests = 600, windowSeconds = 60),
    val userDefault: Bucket = Bucket(maxRequests = 240, windowSeconds = 60),
    val userWrite: Bucket = Bucket(maxRequests = 60, windowSeconds = 60),
    val cleanupIntervalSeconds: Long = 300,
    val excludedPathPrefixes: List<String> = listOf(
        "/management/",
        "/swagger-ui",
        "/v3/api-docs",
        "/error"
    )
) {
    data class Bucket(
        val maxRequests: Int = 120,
        val windowSeconds: Long = 60
    )
}
