package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.service.AuthService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.ReactiveAuthenticationManager
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity
import org.springframework.security.config.web.server.SecurityWebFiltersOrder
import org.springframework.security.config.web.server.ServerHttpSecurity
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.server.resource.BearerTokenAuthenticationToken
import org.springframework.security.web.server.SecurityWebFilterChain
import org.springframework.security.web.server.authentication.AuthenticationWebFilter
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers.pathMatchers
import reactor.core.publisher.Mono

@Configuration
@EnableWebFluxSecurity
class SecurityConfiguration(private val authService: AuthService) {

    private val openRoutes = arrayOf(
            ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/registration",
            ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/recovery",
            ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/authorization"
    )

    private val securityRoutes = arrayOf(
            ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/**"
    )

    @Bean
    fun springSecurityFilterChain(http: ServerHttpSecurity): SecurityWebFilterChain? {
        http
                .csrf().disable()
                .formLogin().disable()
                .httpBasic().disable()
                .logout().disable()
                .headers().frameOptions().disable()
                .and()
                    .authorizeExchange()
                    .pathMatchers(*openRoutes)
                    .permitAll()
                .and()
                    .authorizeExchange()
                    .pathMatchers(*securityRoutes)
                    .authenticated()
                .and()
                    .addFilterAt(bearerAuthenticationFilter(), SecurityWebFiltersOrder.AUTHENTICATION)
        return http.build()
    }

    private fun bearerAuthenticationFilter(): AuthenticationWebFilter? {
        return with(AuthenticationWebFilter(ReactiveAuthenticationManager { Mono.just(it) })) {
            setServerAuthenticationConverter {
                val bearer = "Bearer "
                Mono.justOrEmpty(it)
                        .flatMap<String> { exchange ->
                            Mono.justOrEmpty(exchange.request.headers.getFirst(HttpHeaders.AUTHORIZATION))
                        }
                        .filter { token ->
                            token.length > bearer.length
                        }
                        .flatMap<String> { token ->
                            Mono.justOrEmpty(token.substring(bearer.length))
                        }
                        .flatMap<Auth> { token ->
                            authService.getAuthByAccessToken(token)
                        }
                        .flatMap<Authentication> { auth ->
                            with(BearerTokenAuthenticationToken(auth.accessToken)) {
                                isAuthenticated = true
                                details = auth.userId
                                Mono.just(this)
                            }
                        }
                        .log()
            }
            setRequiresAuthenticationMatcher(pathMatchers(*securityRoutes))
            this
        }
    }
}
