package com.github.shk0da.bioritmic.api.configuration

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.configuration.ratelimit.RateLimitRequest
import com.github.shk0da.bioritmic.api.configuration.ratelimit.RateLimitService
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.error.ApiError
import com.github.shk0da.bioritmic.api.model.error.ApiErrors
import com.github.shk0da.bioritmic.api.service.AuthService
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.core.io.buffer.DataBuffer
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import com.github.shk0da.bioritmic.api.utils.ClientIpUtils
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono

@Configuration
@ConditionalOnProperty(name = ["rate-limit.enabled"], havingValue = "true", matchIfMissing = true)
class RateLimitFilter(
    private val rateLimitService: RateLimitService,
    private val authService: AuthService,
    private val objectMapper: ObjectMapper
) {

    private val log = LoggerFactory.getLogger(RateLimitFilter::class.java)

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE + 20)
    fun rateLimitWebFilter(): WebFilter {
        return WebFilter { exchange: ServerWebExchange, chain: WebFilterChain ->
            val request = exchange.request
            val result = rateLimitService.check(
                RateLimitRequest(
                    path = request.path.value(),
                    method = request.method.name(),
                    clientIp = ClientIpUtils.fromRequest(request),
                    userId = resolveUserId(request)
                )
            )

            if (result.allowed) {
                return@WebFilter chain.filter(exchange)
            }

            log.warn(
                "Rate limit exceeded: bucket={}, ip={}, path={}, method={}",
                result.bucket,
                ClientIpUtils.fromRequest(request),
                request.path.value(),
                request.method.name()
            )
            writeTooManyRequests(exchange, result.retryAfterSeconds)
        }
    }

    private fun resolveUserId(request: ServerHttpRequest): java.util.UUID? {
        val token = ClientIpUtils.bearerToken(request) ?: return null
        return authService.findUserIdByAccessTokenCached(token)
    }

    private fun writeTooManyRequests(exchange: ServerWebExchange, retryAfterSeconds: Long): Mono<Void> {
        val response = exchange.response
        response.statusCode = HttpStatus.TOO_MANY_REQUESTS
        response.headers.contentType = MediaType.APPLICATION_JSON
        response.headers.add(HttpHeaders.RETRY_AFTER, retryAfterSeconds.toString())

        val body = objectMapper.writeValueAsBytes(
            ApiErrors(ApiError.of(ErrorCode.RATE_LIMIT_EXCEEDED))
        )
        val buffer: DataBuffer = response.bufferFactory().wrap(body)
        return response.writeWith(Mono.just(buffer))
    }
}
