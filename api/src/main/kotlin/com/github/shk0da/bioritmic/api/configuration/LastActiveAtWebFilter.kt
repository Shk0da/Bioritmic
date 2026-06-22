package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.repository.AuthRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Configuration
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono
import java.sql.Timestamp

@Configuration
class LastActiveAtWebFilter(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : WebFilter {

    companion object {
        private const val BEARER_PREFIX = "Bearer "
    }

    private val log = LoggerFactory.getLogger(LastActiveAtWebFilter::class.java)

    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val request = exchange.request

        val token = extractBearerToken(request)
        if (!isPublicEndpoint(request) && token != null) {
            Mono.fromCallable {
                runBlocking {
                    try {
                        updateLastActive(token)
                    } catch (@Suppress("TooGenericExceptionCaught") e: Exception) {
                        log.debug("Failed to update last_active_at: {}", e.message)
                    }
                }
            }.subscribe()
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

    private fun extractBearerToken(request: ServerHttpRequest): String? {
        return request.headers.getFirst("Authorization")
            ?.takeIf { it.startsWith(BEARER_PREFIX) }
            ?.substring(BEARER_PREFIX.length)
    }

    private suspend fun updateLastActive(accessToken: String) {
        val auth = authRepository.findByAccessToken(accessToken) ?: return
        userRepository.updateLastActiveAt(auth.userId!!, Timestamp(System.currentTimeMillis()))
    }
}
