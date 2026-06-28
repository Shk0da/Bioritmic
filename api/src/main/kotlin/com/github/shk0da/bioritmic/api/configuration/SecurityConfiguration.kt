package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_SWAGGER
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_BANNED
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_USER
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.ReportService
import com.github.shk0da.bioritmic.api.utils.AuthCookieHelper
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.core.env.Profiles
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.security.authentication.ReactiveAuthenticationManager
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity
import org.springframework.security.config.web.server.SecurityWebFiltersOrder
import org.springframework.security.config.web.server.ServerHttpSecurity
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken
import org.springframework.security.web.server.SecurityWebFilterChain
import org.springframework.security.web.server.authentication.AuthenticationWebFilter
import reactor.core.publisher.Mono

@Configuration
@EnableWebFluxSecurity
class SecurityConfiguration(
    private val authService: AuthService,
    private val userRoleRepository: UserRoleRepository,
    private val reportService: ReportService,
    private val corsConfigurationFactory: CorsConfigurationFactory,
    private val environment: Environment
) {

    private val log = LoggerFactory.getLogger(SecurityConfiguration::class.java)

    private val baseOpenRoutes = arrayOf(
        "$API_WITH_VERSION_1/registration",
        "$API_WITH_VERSION_1/refresh-token",
        "$API_WITH_VERSION_1/recovery",
        "$API_WITH_VERSION_1/reset-password",
        "$API_WITH_VERSION_1/authorization",
        "$API_WITH_VERSION_1/update-email",
        "$API_WITH_VERSION_1/config/client",
        "$API_WITH_VERSION_1/user/*/photo",
        "/api/v1/photos/s3/**",
        "/management/actuator/health",
        "/management/actuator/info"
    )

    private val swaggerRoutes = arrayOf(
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/swagger-resources/**",
        "/v2/api-docs/**",
        "/v3/api-docs/**"
    )

    @Bean
    fun springSecurityFilterChain(http: ServerHttpSecurity): SecurityWebFilterChain? {
        http
            .cors { cors ->
                cors.configurationSource { exchange ->
                    corsConfigurationFactory.create(exchange.request)
                }
            }
            .csrf { it.disable() }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .logout { it.disable() }
            .headers { headers ->
                headers.frameOptions { frame -> frame.disable() }
            }
            .authorizeExchange {
                it.pathMatchers(*openRoutes()).permitAll()
                it.pathMatchers("/management/**").hasRole("ADMIN")
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

    private fun openRoutes(): Array<String> {
        return if (environment.acceptsProfiles(Profiles.of(SPRING_PROFILE_SWAGGER))) {
            baseOpenRoutes + swaggerRoutes
        } else {
            baseOpenRoutes
        }
    }

    @Bean
    fun bearerAuthenticationFilter(): AuthenticationWebFilter? {
        return with(AuthenticationWebFilter(ReactiveAuthenticationManager { Mono.just(it) })) {
            setServerAuthenticationConverter {
                Mono.justOrEmpty(it)
                    .mapNotNull { exchange -> extractAccessToken(exchange.request) }
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

    private fun extractAccessToken(request: ServerHttpRequest): String? {
        request.cookies.getFirst(AuthCookieHelper.ACCESS_TOKEN)?.value?.let { return it }
        val bearer = "Bearer "
        val header = request.headers.getFirst(HttpHeaders.AUTHORIZATION) ?: return null
        if (header.length > bearer.length && header.startsWith(bearer)) {
            return header.substring(bearer.length)
        }
        return null
    }

    private fun toSpringAuthority(role: String): SimpleGrantedAuthority {
        val authority = if (role.startsWith("ROLE_")) role else "ROLE_$role"
        return SimpleGrantedAuthority(authority)
    }
}
