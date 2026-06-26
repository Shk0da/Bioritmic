package com.github.shk0da.bioritmic.api.utils

import org.springframework.http.HttpHeaders
import org.springframework.http.server.reactive.ServerHttpRequest

object ClientIpUtils {

    fun fromRequest(request: ServerHttpRequest): String {
        return request.headers.getFirst("X-Forwarded-For")
            ?.takeIf { it.isNotBlank() }
            ?.split(",")
            ?.firstOrNull()
            ?.trim()
            ?: request.headers.getFirst("X-Real-IP")?.takeIf { it.isNotBlank() }
            ?: request.remoteAddress?.address?.hostAddress
            ?: "unknown"
    }

    fun bearerToken(request: ServerHttpRequest): String? {
        com.github.shk0da.bioritmic.api.utils.AuthCookieHelper.let { cookies ->
            request.cookies.getFirst(cookies.ACCESS_TOKEN)?.value?.let { return it }
        }
        val bearer = "Bearer "
        val header = request.headers.getFirst(HttpHeaders.AUTHORIZATION) ?: return null
        if (header.startsWith(bearer)) {
            return header.substring(bearer.length)
        }
        return null
    }
}
