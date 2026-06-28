package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.domain.Auth
import org.infinispan.Cache
import org.infinispan.commons.api.CacheContainerAdmin
import org.infinispan.configuration.cache.CacheMode
import org.infinispan.configuration.cache.ConfigurationBuilder
import org.infinispan.configuration.global.GlobalConfigurationBuilder
import org.infinispan.manager.DefaultCacheManager
import org.infinispan.manager.EmbeddedCacheManager
import org.infinispan.spring.starter.embedded.InfinispanCacheConfigurer
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.util.concurrent.TimeUnit
import org.infinispan.configuration.cache.Configuration as InfiniSpanConfiguration

@EnableCaching
@Configuration
class InfiniSpanConfiguration {

    companion object {
        private const val BASE_CACHE_MAX_COUNT = 10_000L
        private const val SMALL_CACHE_MAX_COUNT = 100L
        private const val BASE_CACHE_LIFESPAN_MINUTES = 10L
    }

    @Bean
    fun schedulerLockCache(cacheManager: DefaultCacheManager): Cache<String, Boolean> {
        return cacheManager.administration()
            .withFlags(CacheContainerAdmin.AdminFlag.VOLATILE)
            .getOrCreateCache("schedulerLockCache", baseSizeCache())
    }

    @Bean
    fun authTokenCache(cacheManager: DefaultCacheManager): Cache<String, Auth> {
        return cacheManager.administration()
            .withFlags(CacheContainerAdmin.AdminFlag.VOLATILE)
            .getOrCreateCache("authTokenCache", customTimeCache(Auth.SESSION_LIFETIME_DAYS, TimeUnit.DAYS))
    }

    @Bean
    fun rateLimitCache(cacheManager: DefaultCacheManager): Cache<String, Long> {
        return cacheManager.administration()
            .withFlags(CacheContainerAdmin.AdminFlag.VOLATILE)
            .getOrCreateCache("rateLimitCache", customTimeCache(2, TimeUnit.MINUTES))
    }

    @Bean
    fun cacheManager(): DefaultCacheManager {
        val global = GlobalConfigurationBuilder
            .defaultClusteredBuilder()
            .asyncThreadPoolName("taskExecutor")
        return DefaultCacheManager(global.build())
    }

    @Bean
    fun cacheConfigurer(baseSizeCache: InfiniSpanConfiguration): InfinispanCacheConfigurer {
        return InfinispanCacheConfigurer { manager: EmbeddedCacheManager ->
            manager.defineConfiguration("dist-async-config", baseSizeCache)
        }
    }

    @Bean
    fun baseSizeCache(): InfiniSpanConfiguration {
        return ConfigurationBuilder()
            .clustering()
            .cacheMode(CacheMode.DIST_ASYNC)
            .statistics().enable()
            .memory().maxCount(BASE_CACHE_MAX_COUNT)
            .build()
    }

    @Bean
    fun smallSizeCache(): InfiniSpanConfiguration {
        return ConfigurationBuilder()
            .clustering()
            .cacheMode(CacheMode.DIST_ASYNC)
            .statistics().enable()
            .memory().maxCount(SMALL_CACHE_MAX_COUNT)
            .build()
    }

    @Bean
    fun baseTimeCache(): InfiniSpanConfiguration {
        return ConfigurationBuilder()
            .clustering()
            .cacheMode(CacheMode.DIST_ASYNC)
            .statistics().enable()
            .expiration().lifespan(BASE_CACHE_LIFESPAN_MINUTES, TimeUnit.MINUTES)
            .build()
    }

    fun customTimeCache(time: Long, unit: TimeUnit): InfiniSpanConfiguration {
        return ConfigurationBuilder()
            .clustering()
            .cacheMode(CacheMode.DIST_ASYNC)
            .statistics().enable()
            .expiration().lifespan(time, unit)
            .build()
    }
}
