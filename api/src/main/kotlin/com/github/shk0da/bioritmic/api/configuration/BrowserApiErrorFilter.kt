package com.github.shk0da.bioritmic.api.configuration

import org.reactivestreams.Publisher
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.core.io.buffer.DataBuffer
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.http.server.reactive.ServerHttpResponse
import org.springframework.http.server.reactive.ServerHttpResponseDecorator
import org.springframework.stereotype.Component
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono
import java.net.URI

/**
 * When a user opens an API URL directly in the browser tab, redirect to the SPA error page
 * instead of showing raw JSON.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
class BrowserApiErrorFilter(
    private val appSecurityProperties: AppSecurityProperties
) : WebFilter {

    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val request = exchange.request
        if (!shouldConvertToBrowserErrorPage(request)) {
            return chain.filter(exchange)
        }

        val decoratedResponse = object : ServerHttpResponseDecorator(exchange.response) {
            override fun writeWith(body: Publisher<out DataBuffer>): Mono<Void> {
                val status = statusCode
                if (status != null && status.isError) {
                    return redirectToErrorPage(this, status)
                }
                return super.writeWith(body)
            }

            override fun setComplete(): Mono<Void> {
                val status = statusCode
                if (status != null && status.isError) {
                    return redirectToErrorPage(this, status)
                }
                return super.setComplete()
            }
        }

        return chain.filter(exchange.mutate().response(decoratedResponse).build())
    }

    private fun redirectToErrorPage(response: ServerHttpResponse, status: HttpStatusCode): Mono<Void> {
        val code = errorPageCode(status)
        response.statusCode = HttpStatus.FOUND
        response.headers.clear()
        response.headers.location = URI.create("${appSecurityProperties.frontendUrl.trimEnd('/')}/error/$code")
        return response.setComplete()
    }

    private fun shouldConvertToBrowserErrorPage(request: ServerHttpRequest): Boolean {
        val path = request.path.value()
        if (!path.startsWith("/api/")) {
            return false
        }
        if (path.startsWith("/swagger-ui") || path.contains("api-docs")) {
            return false
        }
        return isBrowserNavigation(request)
    }

    companion object {
        fun errorPageCode(status: HttpStatusCode): String = when (status) {
            HttpStatus.UNAUTHORIZED -> "401"
            HttpStatus.FORBIDDEN -> "403"
            HttpStatus.NOT_FOUND -> "404"
            else -> "500"
        }

        fun isBrowserNavigation(request: ServerHttpRequest): Boolean {
            val dest = request.headers.getFirst("Sec-Fetch-Dest")
            if (dest == "document") {
                return true
            }
            val mode = request.headers.getFirst("Sec-Fetch-Mode")
            if (mode == "navigate") {
                return true
            }
            val accept = request.headers.getFirst("Accept") ?: return false
            return accept.contains("text/html") && !accept.startsWith("application/json")
        }
    }
}
