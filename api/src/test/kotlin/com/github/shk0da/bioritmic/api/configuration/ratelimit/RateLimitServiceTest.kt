package com.github.shk0da.bioritmic.api.configuration.ratelimit

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.UUID

class RateLimitServiceTest {

    private lateinit var service: RateLimitService

    @BeforeEach
    fun setUp() {
        val localLimiter = SlidingWindowRateLimiter(cleanupIntervalMs = 60_000)
        service = RateLimitService(
            properties = RateLimitProperties(
                enabled = true,
                publicAuth = RateLimitProperties.Bucket(3, 60),
                globalIp = RateLimitProperties.Bucket(100, 60),
                userDefault = RateLimitProperties.Bucket(5, 60),
                userWrite = RateLimitProperties.Bucket(2, 60)
            ),
            limiter = LocalRateLimitBackend(localLimiter)
        )
    }

    @Test
    fun `public auth endpoint is limited per IP`() {
        val request = RateLimitRequest(
            path = "/api/v1/authorization",
            method = "POST",
            clientIp = "10.0.0.1",
            userId = null
        )

        repeat(3) {
            assertTrue(service.check(request).allowed)
        }
        assertFalse(service.check(request).allowed)
    }

    @Test
    fun `authenticated user has separate default limit`() {
        val userId = UUID.randomUUID()
        val request = RateLimitRequest(
            path = "/api/v1/user/me",
            method = "GET",
            clientIp = "10.0.0.2",
            userId = userId
        )

        repeat(5) {
            assertTrue(service.check(request).allowed)
        }
        assertFalse(service.check(request).allowed)
    }

    @Test
    fun `write endpoints use stricter user bucket`() {
        val userId = UUID.randomUUID()
        val request = RateLimitRequest(
            path = "/api/v1/mailbox",
            method = "POST",
            clientIp = "10.0.0.3",
            userId = userId
        )

        repeat(2) {
            assertTrue(service.check(request).allowed)
        }
        assertFalse(service.check(request).allowed)
    }

    @Test
    fun `management endpoints are excluded`() {
        val request = RateLimitRequest(
            path = "/management/actuator/health",
            method = "GET",
            clientIp = "10.0.0.4",
            userId = null
        )

        repeat(20) {
            assertTrue(service.check(request).allowed)
        }
    }

    @Test
    fun `disabled rate limit always allows`() {
        val disabledService = RateLimitService(
            properties = RateLimitProperties(enabled = false),
            limiter = LocalRateLimitBackend(SlidingWindowRateLimiter())
        )
        val request = RateLimitRequest(
            path = "/api/v1/authorization",
            method = "POST",
            clientIp = "10.0.0.5",
            userId = null
        )

        repeat(20) {
            assertTrue(disabledService.check(request).allowed)
        }
    }
}
