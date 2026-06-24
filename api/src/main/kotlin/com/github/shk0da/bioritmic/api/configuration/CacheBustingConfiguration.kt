package com.github.shk0da.bioritmic.api.configuration

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono

@Configuration
class CacheBustingConfiguration {

    @Bean
    fun indexHtmlNoCacheFilter(): WebFilter {
        return WebFilter { exchange: ServerWebExchange, chain: WebFilterChain ->
            val path = exchange.request.uri.path
            if (path == "/" || path == "/index.html" || path.endsWith(".html")) {
                exchange.response.headers.set(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                exchange.response.headers.set(HttpHeaders.PRAGMA, "no-cache")
                exchange.response.headers.set(HttpHeaders.EXPIRES, "0")
            }
            chain.filter(exchange)
        }
    }
}
