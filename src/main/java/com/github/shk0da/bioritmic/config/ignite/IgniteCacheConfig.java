package com.github.shk0da.bioritmic.config.ignite;

import com.github.shk0da.bioritmic.domain.User;
import org.apache.ignite.cache.CacheAtomicityMode;
import org.apache.ignite.cache.CacheMode;
import org.apache.ignite.configuration.CacheConfiguration;
import org.apache.ignite.plugin.CachePluginConfiguration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Configuration
public class IgniteCacheConfig {

    @Bean
    public CacheConfiguration<String, User> userCacheConfiguration(
            @Value("${ignite.memory.on_heap.user_cache.enabled:false}") boolean onHeap,
            Optional<CachePluginConfiguration> pluginConfiguration) {
        CacheConfiguration<String, User> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName(IgniteCacheName.USER.getName());
        cacheConfiguration.setIndexedTypes(String.class, User.class);
        cacheConfiguration.setTypes(String.class, User.class);
        setupReplicatedCache(onHeap, cacheConfiguration, pluginConfiguration);
        return cacheConfiguration;
    }


    @Bean
    public CacheConfiguration<String, IgniteContext.LockStatus> lockStatusCacheConfiguration(
            @Value("${ignite.memory.on_heap.lock_status_cache.enabled:false}") boolean onHeap) {
        CacheConfiguration<String, IgniteContext.LockStatus> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName(IgniteCacheName.LOCK_STATUS.getName());
        cacheConfiguration.setIndexedTypes(String.class, IgniteContext.LockStatus.class);
        cacheConfiguration.setTypes(String.class, IgniteContext.LockStatus.class);

        setupReplicatedCache(onHeap, cacheConfiguration, Optional.empty());
        return cacheConfiguration;
    }

    @Bean
    public CacheConfiguration<String, Long> lockTimeStampCacheConfiguration(
            @Value("${ignite.memory.on_heap.lock_timestamp_cache.enabled:false}") boolean onHeap) {
        CacheConfiguration<String, Long> cacheConfiguration = new CacheConfiguration<>();
        cacheConfiguration.setName(IgniteCacheName.LOCK_TIME_STAMP.getName());
        cacheConfiguration.setIndexedTypes(String.class, Long.class);
        cacheConfiguration.setTypes(String.class, Long.class);

        setupReplicatedCache(onHeap, cacheConfiguration, Optional.empty());
        return cacheConfiguration;
    }

    private void setupReplicatedCache(boolean onHeap,
                                      CacheConfiguration<?, ?> cacheConfiguration,
                                      Optional<CachePluginConfiguration> pluginConfiguration) {
        cacheConfiguration.setCacheMode(CacheMode.REPLICATED);
        setupCommonConfigForCache(onHeap, cacheConfiguration, pluginConfiguration);
    }

    private void setupCommonConfigForCache(boolean onHeap,
                                           CacheConfiguration<?, ?> cacheConfiguration,
                                           Optional<CachePluginConfiguration> pluginConfiguration) {

        List<String> cacheNamesNotReplicated = Arrays.stream(IgniteCacheName.values())
                .filter(cacheName -> !cacheName.isCrossLocationReplicate())
                .map(IgniteCacheName::getName)
                .collect(Collectors.toList());

        if (!cacheNamesNotReplicated.contains(cacheConfiguration.getName())) {
            pluginConfiguration.ifPresent(cacheConfiguration::setPluginConfigurations);
        }

        cacheConfiguration.setAtomicityMode(CacheAtomicityMode.ATOMIC);
        cacheConfiguration.setEvictionPolicyFactory(null);
        cacheConfiguration.setReadFromBackup(false);
        cacheConfiguration.setOnheapCacheEnabled(onHeap);
        cacheConfiguration.setCopyOnRead(false);
        cacheConfiguration.setNearConfiguration(null);
    }
}
