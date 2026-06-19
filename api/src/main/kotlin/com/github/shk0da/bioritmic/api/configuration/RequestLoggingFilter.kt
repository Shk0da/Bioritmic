package com.github.shk0da.bioritmic.api.configuration

import org.slf4j.MDC
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono
import java.util.UUID

@Configuration
class RequestLoggingFilter {

    companion object {
        const val REQUEST_ID_KEY = "requestId"
        const val USER_ID_KEY = "userId"
        const val METHOD_KEY = "method"
        const val PATH_KEY = "path"
    }

    @Bean
    fun requestLoggingWebFilter(): WebFilter {
        return WebFilter { exchange: ServerWebExchange, chain: WebFilterChain ->
            val request = exchange.request
            val requestId = UUID.randomUUID().toString()
            val method = request.method?.name() ?: "UNKNOWN"
            val path = request.path.value()

            MDC.put(REQUEST_ID_KEY, requestId)
            MDC.put(METHOD_KEY, method)
            MDC.put(PATH_KEY, path)

            val auth = SecurityContextHolder.getContext().authentication
            if (auth != null && auth.principal != null) {
                try {
                    MDC.put(USER_ID_KEY, auth.principal.toString())
                } catch (_: Exception) {
                    // auth may not be available yet at filter level
                }
            }

            exchange.response.headers.add("X-Request-Id", requestId)

            chain.filter(exchange)
                .doFinally {
                    MDC.clear()
                }
        }
    }
}
