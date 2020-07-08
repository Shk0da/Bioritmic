package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.persistence.RoutingDataSource
import com.google.common.collect.ImmutableMap
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.core.env.Environment
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.retry.annotation.EnableRetry
import org.springframework.retry.annotation.Recover
import java.lang.Math.min
import java.sql.SQLException
import java.util.concurrent.TimeUnit
import javax.sql.DataSource

@EnableRetry
@Configuration
@ConfigurationProperties(prefix = "spring.datasource")
class DataSourceConfiguration(private val environment: Environment, private val metricRegistry: MeterRegistry) {

    companion object {

        private val log = LoggerFactory.getLogger(DataSourceConfiguration::class.java)

        private const val MINIMUM_IDLE = 10
        private const val PRIMARY_DATASOURCE_PREFIX = "spring.datasource.primary"
        private const val REPLICA_DATASOURCE_PREFIX = "spring.datasource.replica"

        private const val DB_RECONNECT_INTERVAL_IN_SECONDS = 1L
        private const val MAX_ATTEMPT = 10000
    }

    @Recover
    fun recover(ex: SQLException) {
        log.error("Failed to get or prepare: '{}'.", ex.message)
    }

    @Bean
    @Primary
    fun dataSource(): DataSource {
        val routingDataSource: RoutingDataSource
        try {
            val primaryDataSource = primaryDataSource()
            val replicaDataSource = replicaDataSource()
            val targetDataSources: Map<Any, Any> = ImmutableMap.of<Any, Any>(RoutingDataSource.Route.PRIMARY, primaryDataSource, RoutingDataSource.Route.REPLICA, replicaDataSource
            )
            routingDataSource = RoutingDataSource()
            routingDataSource.setTargetDataSources(targetDataSources)
            routingDataSource.setDefaultTargetDataSource(primaryDataSource)
        } catch (e: Exception) {
            log.error("Fail to instantiate dataSources!", e)
            throw IllegalStateException("Fail to instantiate dataSources!" + e.message, e)
        }
        return routingDataSource
    }

    private fun primaryDataSource(): DataSource {
        return buildDataSource(PRIMARY_DATASOURCE_PREFIX, RoutingDataSource.Route.PRIMARY.name + "Pool")
    }

    private fun replicaDataSource(): DataSource {
        return buildDataSource(REPLICA_DATASOURCE_PREFIX, RoutingDataSource.Route.REPLICA.name + "Pool")
    }

    private fun buildDataSource(dataSourcePrefix: String, poolName: String): HikariDataSource {
        val hikariConfig = HikariConfig()
        hikariConfig.poolName = poolName
        val maxPoolSize = environment.getProperty(String.format("%s.max-connections", dataSourcePrefix))!!.toInt()
        hikariConfig.maximumPoolSize = maxPoolSize
        hikariConfig.minimumIdle = min(MINIMUM_IDLE, maxPoolSize)
        hikariConfig.jdbcUrl = environment.getProperty(String.format("%s.url", dataSourcePrefix))
        hikariConfig.username = environment.getProperty(String.format("%s.username", dataSourcePrefix))
        hikariConfig.password = environment.getProperty(String.format("%s.password", dataSourcePrefix))
        hikariConfig.driverClassName = environment.getProperty(String.format("%s.driver-class-name", dataSourcePrefix))
        hikariConfig.metricRegistry = metricRegistry
        checkDataSource(from(hikariConfig))
        val start = System.currentTimeMillis()
        log.info("Starting new HikariDataSource for dataSourcePrefix={} poolName={}", dataSourcePrefix, poolName)
        val result = HikariDataSource(hikariConfig)
        log.info("End new HikariDataSource for dataSourcePrefix={} poolName={}, totalDuration={}", dataSourcePrefix, poolName, System.currentTimeMillis() - start)
        return result
    }

    fun checkDataSource(dataSource: DriverManagerDataSource) {
        val start = System.currentTimeMillis()
        log.info("Starting checkDataSource for dataSource.getUrl()={}", dataSource.url)
        checkDataSourceAttempt(dataSource, 0)
        log.info("End checkDataSource for dataSource.getUrl()={}, totalDuration={}", dataSource.url, System.currentTimeMillis() - start)
    }

    private fun checkDataSourceAttempt(dataSource: DriverManagerDataSource, currentAttempt: Int) {
        if (currentAttempt > MAX_ATTEMPT) {
            log.error("Fail starting dataSource, max attempt={} reached! checkDataSourceAttempt for dataSource.getUrl()={}, currentAttempt={}",
                    MAX_ATTEMPT, dataSource.url, currentAttempt)
            throw IllegalStateException("Fail starting dataSource, max attempt=" + MAX_ATTEMPT +
                    " reached! checkDataSourceAttempt for dataSource.getUrl()=" + dataSource.url)
        }
        val start = System.currentTimeMillis()
        log.info("Starting checkDataSourceAttempt for dataSource.getUrl()={}, currentAttempt={}",
                dataSource.url, currentAttempt)
        try {
            dataSource.connection.createStatement().use { statement ->
                statement.executeQuery("select 1")
                log.info("Connection to the database is established. dataSource.getUrl()={}, currentAttempt={}, attemptDuration={}",
                        dataSource.url, currentAttempt, System.currentTimeMillis() - start)
            }
        } catch (e: SQLException) {
            val failDuration = System.currentTimeMillis() - start
            log.warn("No database connection [{}], currentAttempt={}, failDuration={}",
                    dataSource.url, currentAttempt, failDuration)
            try {
                TimeUnit.SECONDS.sleep(DB_RECONNECT_INTERVAL_IN_SECONDS)
            } catch (nothing: InterruptedException) {
                // nothing
            }
            log.warn("Attempt to re-establish the connection. dataSource.getUrl()={}, currentAttempt={}, failDuration={}",
                    dataSource.url, currentAttempt, failDuration)
            checkDataSourceAttempt(dataSource, currentAttempt + 1)
        }
    }

    fun from(hikariConfig: HikariConfig): DriverManagerDataSource {
        val driverManagerDataSource = DriverManagerDataSource()
        driverManagerDataSource.setDriverClassName(hikariConfig.driverClassName)
        driverManagerDataSource.username = hikariConfig.username
        driverManagerDataSource.password = hikariConfig.password
        driverManagerDataSource.url = hikariConfig.jdbcUrl
        return driverManagerDataSource
    }
}