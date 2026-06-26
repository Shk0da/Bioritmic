package com.github.shk0da.bioritmic.api.utils

import com.github.shk0da.bioritmic.api.configuration.AppSecurityProperties
import org.springframework.http.ResponseCookie
import java.time.Duration

object AuthCookieHelper {

    const val ACCESS_TOKEN = "access_token"
    const val REFRESH_TOKEN = "refresh_token"

    fun accessTokenCookie(token: String, maxAgeSeconds: Long, secure: Boolean): ResponseCookie {
        return ResponseCookie.from(ACCESS_TOKEN, token)
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Strict")
            .maxAge(Duration.ofSeconds(maxAgeSeconds))
            .build()
    }

    fun refreshTokenCookie(token: String, maxAgeSeconds: Long, secure: Boolean): ResponseCookie {
        return ResponseCookie.from(REFRESH_TOKEN, token)
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Strict")
            .maxAge(Duration.ofSeconds(maxAgeSeconds))
            .build()
    }

    fun clearAccessToken(secure: Boolean): ResponseCookie {
        return ResponseCookie.from(ACCESS_TOKEN, "")
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Strict")
            .maxAge(Duration.ZERO)
            .build()
    }

    fun clearRefreshToken(secure: Boolean): ResponseCookie {
        return ResponseCookie.from(REFRESH_TOKEN, "")
            .httpOnly(true)
            .secure(secure)
            .path("/")
            .sameSite("Strict")
            .maxAge(Duration.ZERO)
            .build()
    }

    fun cookieMaxAgeSeconds(): Long = 7L * 24 * 60 * 60

    fun isSecureCookies(appSecurityProperties: AppSecurityProperties): Boolean {
        return appSecurityProperties.security.cookies.secure
    }
}
