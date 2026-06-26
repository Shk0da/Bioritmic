package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_BANNED
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_USER
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.ReportService
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.ReactiveAuthenticationManager
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity
import org.springframework.security.config.web.server.SecurityWebFiltersOrder
import org.springframework.security.config.web.server.ServerHttpSecurity
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken
import org.springframework.security.web.server.SecurityWebFilterChain
import org.springframework.security.web.server.authentication.AuthenticationWebFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.reactive.config.CorsRegistry
import org.springframework.web.reactive.config.WebFluxConfigurer
import reactor.core.publisher.Mono

@Configuration
@EnableWebFluxSecurity
class SecurityConfiguration(
    private val authService: AuthService,
    private val userRoleRepository: UserRoleRepository,
    private val reportService: ReportService
) : WebFluxConfigurer {

    companion object {
        private const val CORS_MAX_AGE_SECONDS = 3600L
    }

    private val log = LoggerFactory.getLogger(SecurityConfiguration::class.java)

    private val openRoutes = arrayOf(
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/swagger-resources/**",
        "/v2/api-docs/**",
        "/v3/api-docs/**",
        "$API_WITH_VERSION_1/registration",
        "$API_WITH_VERSION_1/refresh-token",
        "$API_WITH_VERSION_1/recovery",
        "$API_WITH_VERSION_1/reset-password",
        "$API_WITH_VERSION_1/authorization",
        "$API_WITH_VERSION_1/update-email",
        "$API_WITH_VERSION_1/user/*/photo",
        "/api/v1/photos/s3/*"
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
            .cors { cors ->
                cors.configurationSource {
                    CorsConfiguration().apply {
                        allowedOrigins = listOf("*")
                        allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        allowedHeaders = listOf("*")
                        exposedHeaders = listOf("*")
                        maxAge = CORS_MAX_AGE_SECONDS
                        allowCredentials = false
                    }
                }
            }
            .csrf { it.disable() }
            .formLogin{ it.disable() }
            .httpBasic{ it.disable() }
            .logout{ it.disable() }
            .headers{ it.frameOptions{ frame -> frame.disable() } }
            .authorizeExchange {
                it.pathMatchers(*openRoutes).permitAll()
                it.anyExchange().authenticated()
            }
            .exceptionHandling {
                it.authenticationEntryPoint { exchange, _ ->
                    Mono.fromRunnable {
                        exchange.response.statusCode = HttpStatus.UNAUTHORIZED
                        exchange.response.headers.remove(HttpHeaders.WWW_AUTHENTICATE)
                    }
                }
            }
            .addFilterAt(bearerAuthenticationFilter(), SecurityWebFiltersOrder.AUTHENTICATION)
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
                    .flatMap { token ->
                        Mono.fromCallable {
                            runBlocking {
                                authService.getAuthByAccessToken(token)
                            }
                        }
                    }
                    .filter { auth -> !auth.isExpired() }
                    .flatMap { auth ->
                        Mono.fromCallable {
                            runBlocking {
                                val userId = auth.userId
                                    ?: return@runBlocking listOf(SimpleGrantedAuthority(ROLE_USER))
                                if (reportService.isUserBanned(userId)) {
                                    return@runBlocking emptyList()
                                }
                                val roles = userRoleRepository.findAllByUserId(userId)
                                if (roles.any { it.role == ROLE_BANNED || it.role == "BANNED" }) {
                                    return@runBlocking emptyList()
                                }
                                roles
                                    .map { role -> toSpringAuthority(role.role) }
                                    .ifEmpty { listOf(SimpleGrantedAuthority(ROLE_USER)) }
                            }
                        }
                            .filter { authorities -> authorities.isNotEmpty() }
                            .map { authorities ->
                            PreAuthenticatedAuthenticationToken(
                                auth.userId as Any,
                                auth.accessToken,
                                authorities
                            )
                        }
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

    private fun toSpringAuthority(role: String): SimpleGrantedAuthority {
        val authority = if (role.startsWith("ROLE_")) role else "ROLE_$role"
        return SimpleGrantedAuthority(authority)
    }
}
