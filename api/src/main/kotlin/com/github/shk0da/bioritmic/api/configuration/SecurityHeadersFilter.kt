package com.github.shk0da.bioritmic.api.configuration

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpHeaders
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono

@Configuration
class SecurityHeadersFilter {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE + 10)
    @ConditionalOnProperty(name = ["app.security.headers.enabled"], havingValue = "true", matchIfMissing = true)
    fun securityHeadersWebFilter(): WebFilter {
        return WebFilter { exchange: ServerWebExchange, chain: WebFilterChain ->
            val headers = exchange.response.headers
            headers.add("X-Content-Type-Options", "nosniff")
            headers.add("X-Frame-Options", "DENY")
            headers.add("Referrer-Policy", "strict-origin-when-cross-origin")
            headers.add("Permissions-Policy", "geolocation=(self), camera=(), microphone=()")
            headers.add(
                "Content-Security-Policy",
                "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'"
            )
            if (exchange.request.headers.getFirst("X-Forwarded-Proto") == "https" ||
                exchange.request.uri.scheme == "https"
            ) {
                headers.add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
            }
            chain.filter(exchange)
        }
    }
}
