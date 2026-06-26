package com.github.shk0da.bioritmic.api.configuration.ratelimit

import org.infinispan.Cache
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.util.concurrent.TimeUnit

@Configuration
@EnableConfigurationProperties(RateLimitProperties::class)
class RateLimitConfiguration {

    @Bean
    fun rateLimitBackend(
        properties: RateLimitProperties,
        rateLimitCache: Cache<String, Long>
    ): RateLimitBackend {
        return InfinispanRateLimitBackend(
            InfinispanSlidingWindowRateLimiter(rateLimitCache)
        )
    }
}

interface RateLimitBackend {
    fun tryAcquire(key: String, maxRequests: Int, windowMs: Long, nowMs: Long = System.currentTimeMillis()): Boolean
    fun retryAfterSeconds(key: String, windowMs: Long, nowMs: Long = System.currentTimeMillis()): Long
}

class LocalRateLimitBackend(
    private val limiter: SlidingWindowRateLimiter
) : RateLimitBackend {
    override fun tryAcquire(key: String, maxRequests: Int, windowMs: Long, nowMs: Long): Boolean {
        return limiter.tryAcquire(key, maxRequests, windowMs, nowMs)
    }

    override fun retryAfterSeconds(key: String, windowMs: Long, nowMs: Long): Long {
        return limiter.retryAfterSeconds(key, windowMs, nowMs)
    }
}

class InfinispanRateLimitBackend(
    private val limiter: InfinispanSlidingWindowRateLimiter
) : RateLimitBackend {
    override fun tryAcquire(key: String, maxRequests: Int, windowMs: Long, nowMs: Long): Boolean {
        return limiter.tryAcquire(key, maxRequests, windowMs, nowMs)
    }

    override fun retryAfterSeconds(key: String, windowMs: Long, nowMs: Long): Long {
        return limiter.retryAfterSeconds(key, windowMs, nowMs)
    }
}
