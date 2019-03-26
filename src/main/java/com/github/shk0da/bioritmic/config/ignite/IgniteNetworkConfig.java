package com.github.shk0da.bioritmic.config.ignite;

import org.apache.ignite.configuration.AddressResolver;
import org.apache.ignite.configuration.AtomicConfiguration;
import org.apache.ignite.configuration.CacheConfiguration;
import org.apache.ignite.configuration.DataRegionConfiguration;
import org.apache.ignite.configuration.DataStorageConfiguration;
import org.apache.ignite.configuration.IgniteConfiguration;
import org.apache.ignite.logger.slf4j.Slf4jLogger;
import org.apache.ignite.plugin.PluginConfiguration;
import org.apache.ignite.spi.communication.tcp.TcpCommunicationSpi;
import org.apache.ignite.spi.discovery.tcp.TcpDiscoverySpi;
import org.apache.ignite.spi.discovery.tcp.ipfinder.TcpDiscoveryIpFinder;
import org.apache.ignite.spi.discovery.tcp.ipfinder.vm.TcpDiscoveryVmIpFinder;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Optional;
import java.util.UUID;

import static com.github.shk0da.bioritmic.util.IgniteUtils.calculateNonHeapMemoryForDataRegion;

@Configuration
@EnableConfigurationProperties({IgniteContext.DiscoveryProperties.class, IgniteContext.CommunicationProperties.class})
public class IgniteNetworkConfig {

    private static final String GRID_NAME = "Bioritmic";
    private final IgniteContext.DiscoveryProperties discoveryProps;
    private final IgniteContext.CommunicationProperties communicationProps;

    public IgniteNetworkConfig(IgniteContext.DiscoveryProperties discoveryProps, IgniteContext.CommunicationProperties communicationProps) {
        this.discoveryProps = discoveryProps;
        this.communicationProps = communicationProps;
    }

    @Bean
    public TcpDiscoverySpi tcpDiscoverySpi(TcpDiscoveryIpFinder tcpDiscoveryIpFinder, Optional<AddressResolver> addressResolver) {
        TcpDiscoverySpi tcpDiscoverySpi = new TcpDiscoverySpi();
        tcpDiscoverySpi.setIpFinder(tcpDiscoveryIpFinder);
        tcpDiscoverySpi.setLocalPort(discoveryProps.getLocalPort());
        tcpDiscoverySpi.setLocalPortRange(discoveryProps.getLocalPortRange());
        tcpDiscoverySpi.setSocketTimeout(discoveryProps.getSocketTimeout());
        tcpDiscoverySpi.setMaxAckTimeout(discoveryProps.getMaxAckTimeout());
        tcpDiscoverySpi.setAckTimeout(discoveryProps.getAckTimeout());
        tcpDiscoverySpi.setReconnectCount(discoveryProps.getReconnectCount());
        tcpDiscoverySpi.setNetworkTimeout(discoveryProps.getNetworkTimeout());
        addressResolver.ifPresent(tcpDiscoverySpi::setAddressResolver);
        return tcpDiscoverySpi;
    }

    @Bean
    @ConditionalOnMissingBean(TcpDiscoveryIpFinder.class)
    public TcpDiscoveryIpFinder tcpDiscoveryIpFinder() {
        TcpDiscoveryVmIpFinder tcpDiscoveryVmIpFinder = new TcpDiscoveryVmIpFinder();
        tcpDiscoveryVmIpFinder.setAddresses(discoveryProps.getNodes());
        return tcpDiscoveryVmIpFinder;
    }

    @Bean
    public TcpCommunicationSpi tcpCommunicationSpi(Optional<AddressResolver> addressResolver) {
        TcpCommunicationSpi tcpCommunicationSpi = new TcpCommunicationSpi();
        tcpCommunicationSpi.setLocalPort(communicationProps.getLocalPort());
        tcpCommunicationSpi.setLocalPortRange(communicationProps.getLocalPortRange());
        tcpCommunicationSpi.setSharedMemoryPort(communicationProps.getSharedMemoryPort());
        tcpCommunicationSpi.setConnectTimeout(communicationProps.getConnectTimeout());
        tcpCommunicationSpi.setMaxConnectTimeout(communicationProps.getMaxConnectTimeout());
        tcpCommunicationSpi.setReconnectCount(communicationProps.getReconnectCount());
        addressResolver.ifPresent(tcpCommunicationSpi::setAddressResolver);
        return tcpCommunicationSpi;
    }

    @Bean
    public PluginConfiguration pluginConfiguration() {
        return new PluginConfiguration() {};
    }

    @Bean
    public IgniteConfiguration igniteCfg(@Value("${client.mode:false}") boolean clientMode,
                                         @Value("${ignite.memory.off_heap.max_mb:512}") long offHeapDataRegionMb,
                                         PluginConfiguration pluginConfiguration,
                                         TcpDiscoverySpi tcpDiscoverySpi,
                                         TcpCommunicationSpi tcpCommunicationSpi,
                                         CacheConfiguration<?, ?>... cacheConfigurations) {
        IgniteConfiguration igniteConfiguration = new IgniteConfiguration();
        igniteConfiguration.setIgniteInstanceName(GRID_NAME + "_" + UUID.randomUUID().toString());
        igniteConfiguration.setPeerClassLoadingEnabled(false);
        igniteConfiguration.setMetricsHistorySize(1);
        igniteConfiguration.setClientMode(clientMode);
        igniteConfiguration.setCacheConfiguration(cacheConfigurations);
        igniteConfiguration.setDiscoverySpi(tcpDiscoverySpi);
        igniteConfiguration.setCommunicationSpi(tcpCommunicationSpi);
        igniteConfiguration.setGridLogger(new Slf4jLogger());
        igniteConfiguration.setPluginConfigurations(pluginConfiguration);
        igniteConfiguration.setAtomicConfiguration(getAtomicConfiguration());
        DataRegionConfiguration dfltDataRegConf = new DataRegionConfiguration();
        dfltDataRegConf.setMaxSize(calculateNonHeapMemoryForDataRegion(offHeapDataRegionMb));
        dfltDataRegConf.setMetricsEnabled(true);
        DataStorageConfiguration dsCfg = new DataStorageConfiguration();
        dsCfg.setDefaultDataRegionConfiguration(dfltDataRegConf);
        igniteConfiguration.setDataStorageConfiguration(dsCfg);
        return igniteConfiguration;
    }

    @NotNull
    private static AtomicConfiguration getAtomicConfiguration() {
        AtomicConfiguration atomicConfiguration = new AtomicConfiguration();
        atomicConfiguration.setBackups(1);
        return atomicConfiguration;
    }
}
