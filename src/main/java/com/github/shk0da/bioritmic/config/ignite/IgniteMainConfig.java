package com.github.shk0da.bioritmic.config.ignite;

import com.github.shk0da.bioritmic.config.BiroritmicConfig;
import lombok.extern.slf4j.Slf4j;
import org.apache.ignite.configuration.BinaryConfiguration;
import org.apache.ignite.configuration.ConnectorConfiguration;
import org.apache.ignite.configuration.DataStorageConfiguration;
import org.apache.ignite.configuration.IgniteConfiguration;
import org.apache.ignite.spi.discovery.tcp.TcpDiscoverySpi;
import org.apache.ignite.spi.discovery.tcp.ipfinder.vm.TcpDiscoveryVmIpFinder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Collections;

@Slf4j
@Configuration
@ConditionalOnClass(name = "org.apache.ignite.Ignite")
public class IgniteMainConfig {

    @Value("${ignite.enableFilePersistence:false}")
    private boolean enableFilePersistence;

    @Value("${ignite.connectorPort:47500}")
    private int igniteConnectorPort;

    @Value("${ignite.serverPortRange:47500..47509}")
    private String igniteServerPortRange;

    @Value("${ignite.persistenceFilePath:./tmp/ig_store}")
    private String ignitePersistenceFilePath;

    @Bean
    public IgniteConfiguration igniteConfiguration() {
        IgniteConfiguration igniteConfiguration = new IgniteConfiguration();
        igniteConfiguration.setClientMode(false);
        // durable file memory persistence
        if (enableFilePersistence) {
            DataStorageConfiguration persistentStoreConfiguration = new DataStorageConfiguration();
            persistentStoreConfiguration.setWalArchivePath("./data/walArchive");
            persistentStoreConfiguration.setWalPath("./data/walStore");
            igniteConfiguration.setDataStorageConfiguration(persistentStoreConfiguration);
        }
        // connector configuration
        ConnectorConfiguration connectorConfiguration = new ConnectorConfiguration();
        connectorConfiguration.setPort(igniteConnectorPort);
        // common ignite configuration
        igniteConfiguration.setMetricsLogFrequency(0);
        igniteConfiguration.setQueryThreadPoolSize(2);
        igniteConfiguration.setDataStreamerThreadPoolSize(1);
        igniteConfiguration.setManagementThreadPoolSize(2);
        igniteConfiguration.setPublicThreadPoolSize(2);
        igniteConfiguration.setSystemThreadPoolSize(2);
        igniteConfiguration.setRebalanceThreadPoolSize(1);
        igniteConfiguration.setAsyncCallbackPoolSize(2);
        igniteConfiguration.setPeerClassLoadingEnabled(false);
        igniteConfiguration.setIgniteInstanceName(BiroritmicConfig.APPLICATION_NAME + "-" + System.currentTimeMillis() + "-grid");
        BinaryConfiguration binaryConfiguration = new BinaryConfiguration();
        binaryConfiguration.setCompactFooter(false);
        igniteConfiguration.setBinaryConfiguration(binaryConfiguration);
        // cluster tcp configuration
        TcpDiscoverySpi tcpDiscoverySpi = new TcpDiscoverySpi();
        TcpDiscoveryVmIpFinder tcpDiscoveryVmIpFinder = new TcpDiscoveryVmIpFinder();
        // need to be changed when it come to real cluster
        tcpDiscoveryVmIpFinder.setAddresses(Collections.singletonList("127.0.0.1:47500..47509"));
        tcpDiscoverySpi.setIpFinder(tcpDiscoveryVmIpFinder);
        igniteConfiguration.setDiscoverySpi(new TcpDiscoverySpi());
        return igniteConfiguration;
    }
}
