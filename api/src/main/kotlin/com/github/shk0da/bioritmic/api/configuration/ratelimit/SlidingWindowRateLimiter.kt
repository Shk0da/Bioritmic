package com.github.shk0da.bioritmic.api.configuration.ratelimit

import java.util.concurrent.ConcurrentHashMap

class SlidingWindowRateLimiter(
    private val cleanupIntervalMs: Long = 300_000L
) {

    private val windows = ConcurrentHashMap<String, WindowState>()
    private var lastGlobalCleanupMs = 0L

    fun tryAcquire(key: String, maxRequests: Int, windowMs: Long, nowMs: Long = System.currentTimeMillis()): Boolean {
        maybeCleanup(nowMs, windowMs)

        val state = windows.computeIfAbsent(key) { WindowState() }
        synchronized(state) {
            state.timestamps.removeAll { it <= nowMs - windowMs }
            if (state.timestamps.size >= maxRequests) {
                return false
            }
            state.timestamps.add(nowMs)
            return true
        }
    }

    @Suppress("ReturnCount")
    fun retryAfterSeconds(key: String, windowMs: Long, nowMs: Long = System.currentTimeMillis()): Long {
        val state = windows[key] ?: return windowMs / 1000
        synchronized(state) {
            val oldest = state.timestamps.minOrNull() ?: return windowMs / 1000
            val waitMs = windowMs - (nowMs - oldest)
            return maxOf(1L, (waitMs + CEILING_OFFSET) / MILLIS_PER_SECOND)
        }
    }

    fun clear() {
        windows.clear()
    }

    private fun maybeCleanup(nowMs: Long, windowMs: Long) {
        if (nowMs - lastGlobalCleanupMs < cleanupIntervalMs) {
            return
        }
        lastGlobalCleanupMs = nowMs
        val expiredKeys = windows.entries.mapNotNull { (key, state) ->
            synchronized(state) {
                state.timestamps.removeAll { it <= nowMs - windowMs }
                if (state.timestamps.isEmpty()) key else null
            }
        }
        expiredKeys.forEach { windows.remove(it) }
    }

    private class WindowState {
        val timestamps = mutableListOf<Long>()
    }

    private companion object {
        const val MILLIS_PER_SECOND = 1000L
        const val CEILING_OFFSET = 999L
    }
}
