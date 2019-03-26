package com.github.shk0da.bioritmic.config.ignite;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.ignite.Ignite;
import org.apache.ignite.IgniteException;
import org.apache.ignite.Ignition;
import org.apache.ignite.configuration.IgniteConfiguration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Configuration
public class IgniteContext {

    @Bean(destroyMethod = "close")
    public Ignite ignite(IgniteConfiguration igniteConfiguration) throws IgniteException {
        final Ignite ignite = Ignition.start(igniteConfiguration);
        ignite.cluster().active(true);
        return ignite;
    }

    @Lazy
    @Bean(destroyMethod = "")
    public IgniteAtomicSequenceExt igniteAtomicSequenceExt(Ignite ignite) {
        return new IgniteAtomicSequenceExtImpl(ignite);
    }

    @Data
    @ConfigurationProperties("discovery")
    public static class DiscoveryProperties {
        private long socketTimeout = TimeUnit.SECONDS.toMillis(20);
        private long ackTimeout = TimeUnit.SECONDS.toMillis(20);
        private long maxAckTimeout = TimeUnit.SECONDS.toMillis(60);
        private long networkTimeout = TimeUnit.SECONDS.toMillis(30);
        private int localPort = 47500;
        private int localPortRange = 1;
        private int reconnectCount = 10_000;
        private int maxMissedClientHeartbeats = 20;
        private List<String> nodes;
    }

    @Data
    @ConfigurationProperties("communication")
    public static class CommunicationProperties {
        private long connectTimeout = TimeUnit.SECONDS.toMillis(20);
        private long maxConnectTimeout = TimeUnit.SECONDS.toMillis(60);
        private int sharedMemoryPort = 48100;
        private int localPort = 47100;
        private int localPortRange = 1;
        private int reconnectCount = 10_000;
    }
}
