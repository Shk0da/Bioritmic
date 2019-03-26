package com.github.shk0da.bioritmic.config.ignite;

import com.github.shk0da.bioritmic.domain.Location;
import com.github.shk0da.bioritmic.domain.Media;
import com.github.shk0da.bioritmic.domain.MediaLibrary;
import com.github.shk0da.bioritmic.domain.User;
import org.apache.ignite.Ignite;
import org.apache.ignite.cache.CacheAtomicityMode;
import org.apache.ignite.cache.CacheMode;
import org.apache.ignite.configuration.CacheConfiguration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.cache.Cache;

@Configuration
public class IgniteCacheConfig {

    public enum LockStatus {LOCKED, UNLOCKED, FINISHED}

    @Bean
    public CacheConfiguration<Long, User> userCacheConfiguration(
            @Value("${ignite.memory.on_heap.user_cache.enabled:false}") boolean onHeap
    ) {
        CacheConfiguration<Long, User> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName(User.CACHE_NAME);
        cacheConfiguration.setIndexedTypes(Long.class, User.class);
        cacheConfiguration.setTypes(Long.class, User.class);
        return defaultSetupCache(onHeap, cacheConfiguration);
    }

    @Bean
    public Cache<Long, User> userCache(Ignite ignite, CacheConfiguration<Long, User> userCacheConfiguration) {
        return ignite.getOrCreateCache(userCacheConfiguration);
    }

    @Bean
    public CacheConfiguration<Long, Location> locationCacheConfiguration(
            @Value("${ignite.memory.on_heap.location_cache.enabled:false}") boolean onHeap
    ) {
        CacheConfiguration<Long, Location> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName(Location.CACHE_NAME);
        cacheConfiguration.setIndexedTypes(Long.class, Location.class);
        cacheConfiguration.setTypes(Long.class, Location.class);
        return defaultSetupCache(onHeap, cacheConfiguration);
    }

    @Bean
    public Cache<Long, Location> locationCache(Ignite ignite, CacheConfiguration<Long, Location> locationCacheConfiguration) {
        return ignite.getOrCreateCache(locationCacheConfiguration);
    }

    @Bean
    public CacheConfiguration<Long, Media> mediaCacheConfiguration(
            @Value("${ignite.memory.on_heap.media_cache.enabled:false}") boolean onHeap
    ) {
        CacheConfiguration<Long, Media> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName(Media.CACHE_NAME);
        cacheConfiguration.setIndexedTypes(Long.class, Media.class);
        cacheConfiguration.setTypes(Long.class, Media.class);
        return defaultSetupCache(onHeap, cacheConfiguration);
    }

    @Bean
    public Cache<Long, Media> mediaCache(Ignite ignite, CacheConfiguration<Long, Media> mediaCacheConfiguration) {
        return ignite.getOrCreateCache(mediaCacheConfiguration);
    }

    @Bean
    public CacheConfiguration<Long, MediaLibrary> mediaLibraryCacheConfiguration(
            @Value("${ignite.memory.on_heap.media_library_cache.enabled:false}") boolean onHeap
    ) {
        CacheConfiguration<Long, MediaLibrary> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName(MediaLibrary.CACHE_NAME);
        cacheConfiguration.setIndexedTypes(Long.class, MediaLibrary.class);
        cacheConfiguration.setTypes(Long.class, MediaLibrary.class);
        return defaultSetupCache(onHeap, cacheConfiguration);
    }

    @Bean
    public Cache<Long, MediaLibrary> mediaLibraryCache(Ignite ignite, CacheConfiguration<Long, MediaLibrary> mediaLibraryCacheConfiguration) {
        return ignite.getOrCreateCache(mediaLibraryCacheConfiguration);
    }

    @Bean
    public CacheConfiguration<String, LockStatus> lockStatusCacheConfiguration(
            @Value("${ignite.memory.on_heap.lock_status_cache.enabled:false}") boolean onHeap
    ) {
        CacheConfiguration<String, LockStatus> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName("lockStatusCache");
        cacheConfiguration.setIndexedTypes(String.class, LockStatus.class);
        cacheConfiguration.setTypes(String.class, LockStatus.class);
        return defaultSetupCache(onHeap, cacheConfiguration);
    }

    @Bean
    public CacheConfiguration<String, Long> lockTimeStampCacheConfiguration(
            @Value("${ignite.memory.on_heap.lock_timestamp_cache.enabled:false}") boolean onHeap
    ) {
        CacheConfiguration<String, Long> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName("lockTimestampCache");
        cacheConfiguration.setIndexedTypes(String.class, Long.class);
        cacheConfiguration.setTypes(String.class, Long.class);
        return defaultSetupCache(onHeap, cacheConfiguration);
    }

    private <K, V> CacheConfiguration<K, V> defaultSetupCache(boolean onHeap, CacheConfiguration<K, V> cacheConfiguration) {
        cacheConfiguration.setCacheMode(CacheMode.REPLICATED);
        cacheConfiguration.setAtomicityMode(CacheAtomicityMode.ATOMIC);
        cacheConfiguration.setEvictionPolicyFactory(null);
        cacheConfiguration.setReadFromBackup(false);
        cacheConfiguration.setOnheapCacheEnabled(onHeap);
        cacheConfiguration.setCopyOnRead(false);
        cacheConfiguration.setNearConfiguration(null);
        return cacheConfiguration;
    }
}
