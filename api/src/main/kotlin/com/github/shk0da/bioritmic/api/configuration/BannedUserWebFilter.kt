package com.github.shk0da.bioritmic.api.configuration

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.error.ApiError
import com.github.shk0da.bioritmic.api.model.error.ApiErrors
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.AuthCookieHelper
import kotlinx.coroutines.runBlocking
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.server.reactive.ServerHttpRequest
import org.springframework.stereotype.Component
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import reactor.core.publisher.Mono
import org.springframework.web.server.WebFilterChain
import java.util.UUID

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
class BannedUserWebFilter(
    private val authService: AuthService,
    private val userService: UserService,
    private val objectMapper: ObjectMapper,
    private val appSecurityProperties: AppSecurityProperties,
) : WebFilter {

    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val request = exchange.request
        val token = extractAccessToken(request) ?: return chain.filter(exchange)
        val auth = runBlocking { authService.getAuthByAccessToken(token) } ?: return chain.filter(exchange)
        if (auth.isExpired()) {
            return chain.filter(exchange)
        }
        val userId = auth.userId ?: return chain.filter(exchange)
        if (!runBlocking { userService.isUserBanned(userId) }) {
            return chain.filter(exchange)
        }

        runBlocking { authService.deleteAuthByUserId(userId) }
        return writeBannedResponse(exchange)
    }

    private fun writeBannedResponse(exchange: ServerWebExchange): Mono<Void> {
        val response = exchange.response
        response.statusCode = HttpStatus.FORBIDDEN
        response.headers.contentType = MediaType.APPLICATION_JSON
        val secure = AuthCookieHelper.isSecureCookies(appSecurityProperties)
        response.addCookie(AuthCookieHelper.clearAccessToken(secure))
        response.addCookie(AuthCookieHelper.clearRefreshToken(secure))
        response.headers.remove(HttpHeaders.WWW_AUTHENTICATE)

        val body = objectMapper.writeValueAsBytes(ApiErrors(ApiError.of(ErrorCode.USER_BANNED)))
        val buffer = response.bufferFactory().wrap(body)
        return response.writeWith(Mono.just(buffer))
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
}
