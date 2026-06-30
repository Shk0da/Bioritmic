package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.repository.AuthRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.utils.AuthCookieHelper
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Configuration
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono
import reactor.core.scheduler.Schedulers
import java.sql.Timestamp
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

@Configuration
class LastActiveAtWebFilter(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : WebFilter {

    companion object {
        private const val BEARER_PREFIX = "Bearer "
        private const val UPDATE_INTERVAL_MS = 60_000L
        private const val CACHE_MAX_SIZE = 20_000
        private const val CACHE_TTL_MS = 15 * 60_000L
        private const val CLEANUP_EVERY_N_UPDATES = 32
    }

    private val log = LoggerFactory.getLogger(LastActiveAtWebFilter::class.java)
    private val lastSeenByTokenMs = ConcurrentHashMap<String, Long>()
    private val cleanupCounter = AtomicInteger(0)

    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val request = exchange.request

        val now = System.currentTimeMillis()
        val token = extractToken(request)
        if (!isPublicEndpoint(request) && token != null && !isRecentlyUpdated(token, now)) {
            markUpdated(token, now)
            Mono.fromCallable {
                runBlocking {
                    try {
                        updateLastActive(token)
                    } catch (@Suppress("TooGenericExceptionCaught") e: Exception) {
                        log.debug("Failed to update last_active_at: {}", e.message)
                    }
                }
            }
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe()
        }

        return chain.filter(exchange)
    }

    private fun isPublicEndpoint(request: ServerHttpRequest): Boolean {
        val path = request.path.value()
        return path.startsWith("/api/v1/authorization") ||
                path.startsWith("/api/v1/registration") ||
                path.startsWith("/api/v1/refresh-token") ||
                path.startsWith("/api/v1/recovery") ||
                path.startsWith("/api/v1/reset-password") ||
                path.startsWith("/api/v1/update-email") ||
                path.startsWith("/swagger-ui") ||
                path.startsWith("/v3/api-docs") ||
                path.startsWith("/management/")
    }

    private fun extractToken(request: ServerHttpRequest): String? {
        request.cookies.getFirst(AuthCookieHelper.ACCESS_TOKEN)?.value?.let { return it }
        return request.headers.getFirst("Authorization")
            ?.takeIf { it.startsWith(BEARER_PREFIX) }
            ?.substring(BEARER_PREFIX.length)
    }

    private suspend fun updateLastActive(accessToken: String) {
        val auth = authRepository.findByAccessToken(accessToken) ?: return
        userRepository.updateLastActiveAt(auth.userId!!, Timestamp(System.currentTimeMillis()))
    }

    private fun isRecentlyUpdated(token: String, now: Long): Boolean {
        val lastUpdated = lastSeenByTokenMs[token] ?: return false
        return now - lastUpdated < UPDATE_INTERVAL_MS
    }

    private fun markUpdated(token: String, now: Long) {
        lastSeenByTokenMs[token] = now
        if (lastSeenByTokenMs.size > CACHE_MAX_SIZE &&
            cleanupCounter.incrementAndGet() % CLEANUP_EVERY_N_UPDATES == 0
        ) {
            val threshold = now - CACHE_TTL_MS
            lastSeenByTokenMs.entries.removeIf { it.value < threshold }
        }
    }
}
