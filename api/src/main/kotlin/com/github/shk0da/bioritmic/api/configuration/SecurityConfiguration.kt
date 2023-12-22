package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_USER
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.service.AuthService
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.ReactiveAuthenticationManager
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity
import org.springframework.security.config.web.server.SecurityWebFiltersOrder
import org.springframework.security.config.web.server.ServerHttpSecurity
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken
import org.springframework.security.web.server.SecurityWebFilterChain
import org.springframework.security.web.server.authentication.AuthenticationWebFilter
import org.springframework.web.reactive.config.CorsRegistry
import org.springframework.web.reactive.config.WebFluxConfigurer
import reactor.core.publisher.Mono

@Configuration
@EnableWebFluxSecurity
class SecurityConfiguration(private val authService: AuthService) : WebFluxConfigurer {

    private val log = LoggerFactory.getLogger(SecurityConfiguration::class.java)

    private val openRoutes = arrayOf(
            "/management/actuator/**",
            "/swagger-ui/**",
            "/swagger-resources/**",
            "/v2/api-docs/**",
            "$API_WITH_VERSION_1/registration",
            "$API_WITH_VERSION_1/refresh-token",
            "$API_WITH_VERSION_1/recovery",
            "$API_WITH_VERSION_1/reset-password",
            "$API_WITH_VERSION_1/authorization",
            "$API_WITH_VERSION_1/update-email"
    )

    override fun addCorsMappings(registry: CorsRegistry) {
        registry
                .addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("*")
                .allowedHeaders("*")
    }

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
                    .addFilterAt(bearerAuthenticationFilter(), SecurityWebFiltersOrder.AUTHENTICATION)
                    .authorizeExchange()
                    .anyExchange()
                    .authenticated()
        return http.build()
    }

    @Bean
    fun bearerAuthenticationFilter(): AuthenticationWebFilter? {
        return with(AuthenticationWebFilter(ReactiveAuthenticationManager { Mono.just(it) })) {
            setServerAuthenticationConverter {
                val bearer = "Bearer "
                Mono.justOrEmpty(it)
                        .flatMap { exchange ->
                            Mono.justOrEmpty(exchange.request.headers.getFirst(HttpHeaders.AUTHORIZATION))
                        }
                        .filter { token ->
                            token.length > bearer.length
                        }
                        .flatMap { token ->
                            Mono.justOrEmpty(token.substring(bearer.length))
                        }
                        .flatMap<Auth> { token ->
                            authService.getAuthByAccessToken(token)
                        }
                        .filter { auth -> !auth.isExpired() }
                        .map { auth ->
                            PreAuthenticatedAuthenticationToken(
                                    auth.userId,
                                    auth.accessToken,
                                    mutableListOf(SimpleGrantedAuthority(ROLE_USER)))
                        }
            }
            setAuthenticationSuccessHandler { webFilterExchange, authentication ->
                log.debug("authentication: {}", authentication)
                SecurityContextHolder.getContext().authentication = authentication
                webFilterExchange.chain.filter(webFilterExchange.exchange)
            }
            this
        }
    }
}
