package com.github.shk0da.bioritmic.api.configuration.ratelimit

import org.infinispan.Cache
import java.util.concurrent.TimeUnit

/**
 * Distributed fixed-window rate limiter backed by Infinispan (works across JVM instances).
 */
class InfinispanSlidingWindowRateLimiter(
    private val cache: Cache<String, Long>
) {

    fun tryAcquire(key: String, maxRequests: Int, windowMs: Long, nowMs: Long = System.currentTimeMillis()): Boolean {
        val bucketKey = "$key:${nowMs / windowMs}"
        val current = cache.get(bucketKey) ?: 0L
        if (current >= maxRequests) {
            return false
        }
        cache.put(bucketKey, current + 1, windowMs, TimeUnit.MILLISECONDS)
        return true
    }

    fun retryAfterSeconds(key: String, windowMs: Long, nowMs: Long = System.currentTimeMillis()): Long {
        val windowEnd = ((nowMs / windowMs) + 1) * windowMs
        return maxOf(1L, (windowEnd - nowMs + 999) / 1000)
    }
}
