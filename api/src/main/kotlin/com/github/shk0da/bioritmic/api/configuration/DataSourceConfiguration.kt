package com.github.shk0da.bioritmic.api.configuration

import com.google.common.collect.Maps
import io.r2dbc.pool.ConnectionPool
import io.r2dbc.pool.ConnectionPoolConfiguration
import io.r2dbc.spi.ConnectionFactories
import io.r2dbc.spi.ConnectionFactory
import io.r2dbc.spi.ConnectionFactoryOptions
import io.r2dbc.spi.Option
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.data.r2dbc.config.AbstractR2dbcConfiguration
import org.springframework.data.r2dbc.connectionfactory.R2dbcTransactionManager
import org.springframework.data.r2dbc.connectionfactory.lookup.AbstractRoutingConnectionFactory
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.retry.annotation.EnableRetry
import org.springframework.transaction.reactive.TransactionSynchronizationManager.forCurrentTransaction
import reactor.core.publisher.Mono
import java.sql.SQLException
import java.time.Duration
import java.time.temporal.ChronoUnit
import java.util.concurrent.TimeUnit

@EnableRetry
@Configuration
@EnableR2dbcRepositories
class DataSourceConfiguration(private val environment: Environment) : AbstractR2dbcConfiguration() {

    companion object {

        private val log = LoggerFactory.getLogger(DataSourceConfiguration::class.java)

        private const val MINIMUM_IDLE = 10
        private const val DB_RECONNECT_INTERVAL_IN_SECONDS = 1L
        private const val MAX_ATTEMPT = 10000
        private const val MASTER_ROUTING_KEY = "master"
        private const val SLAVE_ROUTING_KEY = "slave"
        private const val PROPERTY_KEY_DATASOURCE = "spring.datasource"
        private const val PROPERTY_KEY_HOST = "host"
        private const val PROPERTY_KEY_PORT = "port"
        private const val PROPERTY_KEY_DATABASE = "database"
        private const val PROPERTY_KEY_URL = "url"
        private const val PROPERTY_KEY_DRIVER = "driver"
        private const val PROPERTY_KEY_USER = "user"
        private const val PROPERTY_KEY_USERNAME = "username"
        private const val PROPERTY_KEY_PASSWORD = "password"
        private const val PROPERTY_KEY_MAX_CONNECTIONS = "max-connections"
    }

    inner class RoutingConnectionFactory : AbstractRoutingConnectionFactory() {
        override fun determineCurrentLookupKey(): Mono<Any> = forCurrentTransaction().map {
            val isReadOnly = it.isActualTransactionActive && it.isCurrentTransactionReadOnly
            if (isReadOnly) SLAVE_ROUTING_KEY else MASTER_ROUTING_KEY
        }
    }

    @Bean
    override fun connectionFactory(): ConnectionFactory {
        val factories = Maps.newHashMap<String, Any>()
        factories[MASTER_ROUTING_KEY] = masterConnectionFactory()
        factories[SLAVE_ROUTING_KEY] = slaveConnectionFactory()

        val routingConnectionFactory = RoutingConnectionFactory()
        routingConnectionFactory.setTargetConnectionFactories(factories)
        routingConnectionFactory.setDefaultTargetConnectionFactory(factories[MASTER_ROUTING_KEY]!!)
        return routingConnectionFactory
    }

    @Bean
    fun masterConnectionFactory(): ConnectionFactory = buildConnectionFactory(MASTER_ROUTING_KEY)

    @Bean
    fun slaveConnectionFactory(): ConnectionFactory = buildConnectionFactory(SLAVE_ROUTING_KEY)

    @Bean
    fun masterTransactionManager(masterConnectionFactory: ConnectionFactory) = R2dbcTransactionManager(masterConnectionFactory)

    @Bean
    fun slaveTransactionManager(slaveConnectionFactory: ConnectionFactory) = R2dbcTransactionManager(slaveConnectionFactory)

    private fun buildConnectionFactory(dataSourcePrefix: String): ConnectionFactory {
        val url = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_URL")!!
        val username = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_USERNAME")!!
        val password = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_PASSWORD")!!
        checkDataSource(DriverManagerDataSource(url.replace("r2dbc", "jdbc"), username, password))

        val driver = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DRIVER")!!
        val host = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_HOST")!!
        val port = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_PORT")!!
        val database = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DATABASE")!!
        val connectionFactory = ConnectionFactories.get(ConnectionFactoryOptions.builder()
                .option(Option.valueOf(PROPERTY_KEY_DRIVER), driver)
                .option(Option.valueOf(PROPERTY_KEY_HOST), host)
                .option(Option.valueOf(PROPERTY_KEY_PORT), port)
                .option(Option.valueOf(PROPERTY_KEY_DATABASE), database)
                .option(Option.valueOf(PROPERTY_KEY_URL), url)
                .option(Option.valueOf(PROPERTY_KEY_USER), username)
                .option(Option.valueOf(PROPERTY_KEY_USERNAME), username)
                .option(Option.valueOf(PROPERTY_KEY_PASSWORD), password)
                .build())

        val maxPoolSize = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_MAX_CONNECTIONS")!!.toInt()
        val config = ConnectionPoolConfiguration
                .builder(connectionFactory)
                .name(dataSourcePrefix)
                .maxIdleTime(Duration.of(MINIMUM_IDLE.toLong(), ChronoUnit.SECONDS))
                .maxSize(maxPoolSize)
                .build()
        return ConnectionPool(config)
    }

    private fun checkDataSource(dataSource: DriverManagerDataSource, currentAttempt: Int = 1) {
        val start = System.currentTimeMillis()
        if (currentAttempt > MAX_ATTEMPT) {
            throw IllegalStateException("Fail connect to dataSource [{}]" + dataSource.url)
        }
        try {
            dataSource.connection.createStatement().use { statement ->
                statement.executeQuery("select 1")
                log.info("Connection to the database is established. [{}]", dataSource.url)
            }
        } catch (e: SQLException) {
            val failDuration = System.currentTimeMillis() - start
            log.warn("No database connection [{}], currentAttempt={}, failDuration={}", dataSource.url, currentAttempt, failDuration)
            try {
                TimeUnit.SECONDS.sleep(DB_RECONNECT_INTERVAL_IN_SECONDS)
            } catch (nothing: InterruptedException) {
                // nothing
            }
            log.warn("Attempt to re-establish the connection [{}].", dataSource.url)
            checkDataSource(dataSource, currentAttempt + 1)
        }
    }
}