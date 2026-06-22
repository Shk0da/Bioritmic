package com.github.shk0da.bioritmic.api.configuration

import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono
import java.util.concurrent.ConcurrentHashMap

@Configuration
@ConditionalOnProperty(name = ["rate-limit.enabled"], havingValue = "true", matchIfMissing = true)
class RateLimitFilter {

    private val log = LoggerFactory.getLogger(RateLimitFilter::class.java)

    companion object {
        private const val MAX_REQUESTS = 10
        private const val WINDOW_MS = 60_000L
        private const val CLEANUP_INTERVAL_MS = 300_000L
    }

    private val requestCounts = ConcurrentHashMap<String, MutableList<Long>>()
    private val lastCleanup = ConcurrentHashMap<String, Long>()

    @Bean
    fun rateLimitWebFilter(): WebFilter {
        return WebFilter { exchange: ServerWebExchange, chain: WebFilterChain ->
            val request = exchange.request
            val path = request.path.value()

            if (!isRateLimitedEndpoint(path)) {
                return@WebFilter chain.filter(exchange)
            }

            val clientIp = getClientIp(request)
            val key = "$clientIp:$path"
            val now = System.currentTimeMillis()

            maybeCleanup(now)

            val timestamps = requestCounts.computeIfAbsent(key) { mutableListOf() }

            synchronized(timestamps) {
                timestamps.removeAll { it < now - WINDOW_MS }
                if (timestamps.size >= MAX_REQUESTS) {
                    log.warn("Rate limit exceeded for {} on {}", clientIp, path)
                    exchange.response.statusCode = HttpStatus.TOO_MANY_REQUESTS
                    exchange.response.headers.add("Retry-After", "60")
                    return@WebFilter Mono.empty()
                }
                timestamps.add(now)
            }

            chain.filter(exchange)
        }
    }

    private fun maybeCleanup(now: Long) {
        if (now - (lastCleanup["global"] ?: 0L) > CLEANUP_INTERVAL_MS) {
            lastCleanup["global"] = now
            val expiredKeys = requestCounts.entries.filter { (_, timestamps) ->
                synchronized(timestamps) {
                    timestamps.removeAll { it < now - WINDOW_MS }
                    timestamps.isEmpty()
                }
            }.map { it.key }
            expiredKeys.forEach { requestCounts.remove(it) }
        }
    }

    private fun isRateLimitedEndpoint(path: String): Boolean {
        return path.startsWith("/api/v1/registration") ||
                path.startsWith("/api/v1/authorization") ||
                path.startsWith("/api/v1/recovery")
    }

    private fun getClientIp(request: ServerHttpRequest): String {
        return request.headers.getFirst("X-Forwarded-For")
            ?.takeIf { it.isNotBlank() }
            ?.split(",")?.get(0)?.trim()
            ?: request.headers.getFirst("X-Real-IP")?.takeIf { it.isNotBlank() }
            ?: request.remoteAddress?.address?.hostAddress
            ?: "unknown"
    }
}
