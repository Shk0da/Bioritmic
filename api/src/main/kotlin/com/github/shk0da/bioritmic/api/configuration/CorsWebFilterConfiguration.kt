package com.github.shk0da.bioritmic.api.configuration

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.web.cors.reactive.CorsConfigurationSource
import org.springframework.web.cors.reactive.CorsWebFilter

@Configuration
class CorsWebFilterConfiguration(
    private val corsConfigurationFactory: CorsConfigurationFactory
) {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    fun corsWebFilter(): CorsWebFilter {
        val source = CorsConfigurationSource { exchange ->
            corsConfigurationFactory.create(exchange.request)
        }
        return CorsWebFilter(source)
    }
}
