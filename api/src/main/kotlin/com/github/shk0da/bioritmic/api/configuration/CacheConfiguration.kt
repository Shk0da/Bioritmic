package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.configuration.CacheConfiguration.Constants.DEFAULT_CACHE
import com.github.shk0da.bioritmic.api.configuration.CacheConfiguration.Constants.FAST_CACHE
import com.google.common.cache.CacheBuilder
import org.springframework.cache.Cache
import org.springframework.cache.CacheManager
import org.springframework.cache.annotation.CachingConfigurerSupport
import org.springframework.cache.annotation.EnableCaching
import org.springframework.cache.concurrent.ConcurrentMapCache
import org.springframework.cache.concurrent.ConcurrentMapCacheManager
import org.springframework.cache.interceptor.KeyGenerator
import org.springframework.cache.interceptor.SimpleKeyGenerator
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import java.time.Duration
import java.time.temporal.ChronoUnit
import java.util.*
import java.util.concurrent.ConcurrentMap

@EnableCaching
@Configuration
class CacheConfiguration : CachingConfigurerSupport() {

    object Constants {
        const val DEFAULT_CACHE = "defaultCache"
        const val FAST_CACHE = "fastCache"
    }

    private fun cacheBuilder(duration: Duration): ConcurrentMap<Any, Any> =
            CacheBuilder.newBuilder().expireAfterWrite(duration).build<Any, Any>().asMap()

    private val caches: Map<String, ConcurrentMap<Any, Any>> = object : HashMap<String, ConcurrentMap<Any, Any>>() {
        init {
            put(DEFAULT_CACHE, cacheBuilder(Duration.of(1, ChronoUnit.HOURS)))
            put(FAST_CACHE, cacheBuilder(Duration.of(1, ChronoUnit.SECONDS)))
        }
    }

    @Bean
    @Primary
    override fun cacheManager(): CacheManager? {
        val cacheManager: ConcurrentMapCacheManager = object : ConcurrentMapCacheManager() {
            override fun createConcurrentMapCache(name: String): Cache {
                return ConcurrentMapCache(name, caches.getOrDefault(name, caches[DEFAULT_CACHE])!!, false)
            }
        }
        // static caches
        cacheManager.setCacheNames(listOf(FAST_CACHE))
        return cacheManager
    }

    @Bean
    override fun keyGenerator(): KeyGenerator? {
        return SimpleKeyGenerator()
    }
}