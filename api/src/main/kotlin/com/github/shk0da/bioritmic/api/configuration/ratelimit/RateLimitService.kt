package com.github.shk0da.bioritmic.api.configuration.ratelimit

import org.springframework.stereotype.Service
import java.util.UUID

data class RateLimitRequest(
    val path: String,
    val method: String,
    val clientIp: String,
    val userId: UUID?
)

data class RateLimitResult(
    val allowed: Boolean,
    val retryAfterSeconds: Long = 60,
    val bucket: String? = null
) {
    companion object {
        fun allowed() = RateLimitResult(allowed = true)
    }
}

@Service
class RateLimitService(
    private val properties: RateLimitProperties,
    private val limiter: RateLimitBackend
) {

    @Suppress("ReturnCount")
    fun check(request: RateLimitRequest): RateLimitResult {
        if (!properties.enabled) {
            return RateLimitResult.allowed()
        }
        if (isExcluded(request.path)) {
            return RateLimitResult.allowed()
        }

        if (request.path.startsWith("/api/")) {
            val global = acquire(
                key = "ip:global:${request.clientIp}",
                bucket = properties.globalIp,
                label = "global-ip"
            )
            if (!global.allowed) {
                return global
            }
        }

        if (isPublicAuthPath(request.path)) {
            return acquire(
                key = "ip:auth:${request.clientIp}:${request.path}",
                bucket = properties.publicAuth,
                label = "public-auth"
            )
        }

        val userId = request.userId
        if (userId != null && request.path.startsWith("/api/")) {
            val writeHeavy = isWriteHeavy(request.path, request.method)
            val bucket = if (writeHeavy) properties.userWrite else properties.userDefault
            val label = if (writeHeavy) "user-write" else "user"
            return acquire(
                key = "$label:$userId",
                bucket = bucket,
                label = label
            )
        }

        return RateLimitResult.allowed()
    }

    private fun acquire(key: String, bucket: RateLimitProperties.Bucket, label: String): RateLimitResult {
        val windowMs = bucket.windowSeconds * 1000
        val allowed = limiter.tryAcquire(key, bucket.maxRequests, windowMs)
        if (allowed) {
            return RateLimitResult.allowed()
        }
        return RateLimitResult(
            allowed = false,
            retryAfterSeconds = limiter.retryAfterSeconds(key, windowMs),
            bucket = label
        )
    }

    private fun isExcluded(path: String): Boolean {
        return properties.excludedPathPrefixes.any { path.startsWith(it) }
    }

    private fun isPublicAuthPath(path: String): Boolean {
        return path.startsWith("/api/v1/registration") ||
            path.startsWith("/api/v1/authorization") ||
            path.startsWith("/api/v1/recovery") ||
            path.startsWith("/api/v1/refresh-token") ||
            path.startsWith("/api/v1/reset-password") ||
            path.startsWith("/api/v1/verify-email") && !path.startsWith("/api/v1/verify-email/resend")
    }

    private fun isWriteHeavy(path: String, method: String): Boolean {
        if (method !in WRITE_METHODS) {
            return false
        }
        return path.startsWith("/api/v1/mailbox") ||
            path.startsWith("/api/v1/meetings") ||
            path.startsWith("/api/v1/bookmarks") ||
            path.contains("/photo") ||
            path.startsWith("/api/v1/search") ||
            path.startsWith("/api/v1/report") ||
            path.startsWith("/api/v1/feedback") ||
            path.startsWith("/api/v1/stories") ||
            path.startsWith("/api/v1/admin")
    }

    companion object {
        private val WRITE_METHODS = setOf("POST", "PUT", "PATCH", "DELETE")
    }
}
