package com.github.shk0da.bioritmic.api.configuration.datasource

import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.MASTER_ROUTING_KEY
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.MINIMUM_IDLE
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_DATABASE
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_DATASOURCE
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_DRIVER
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_HOST
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_MAX_CONNECTIONS
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_PASSWORD
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_PORT
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_R2DBC_URL
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_USER
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_USERNAME
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.SLAVE_ROUTING_KEY
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.DefaultDataSourceProfileCondition
import com.google.common.collect.Maps
import io.r2dbc.pool.ConnectionPool
import io.r2dbc.pool.ConnectionPoolConfiguration
import io.r2dbc.pool.PoolingConnectionFactoryProvider.MAX_SIZE
import io.r2dbc.spi.ConnectionFactories
import io.r2dbc.spi.ConnectionFactory
import io.r2dbc.spi.ConnectionFactoryOptions
import io.r2dbc.spi.Option
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Conditional
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.core.env.Environment
import org.springframework.core.env.Profiles
import org.springframework.data.r2dbc.config.AbstractR2dbcConfiguration
import org.springframework.data.r2dbc.connectionfactory.R2dbcTransactionManager
import org.springframework.data.r2dbc.connectionfactory.lookup.AbstractRoutingConnectionFactory
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.transaction.TransactionManager
import org.springframework.transaction.reactive.TransactionSynchronizationManager.forCurrentTransaction
import reactor.core.publisher.Mono
import java.time.Duration
import java.time.temporal.ChronoUnit

@Configuration
@EnableR2dbcRepositories("com.github.shk0da.bioritmic.api.repository.r2dbc")
@Conditional(value = [DefaultDataSourceProfileCondition::class])
class R2dbcConfiguration(private val environment: Environment) : AbstractR2dbcConfiguration(), DataSourceConfiguration {

    inner class RoutingConnectionFactory : AbstractRoutingConnectionFactory() {
        override fun determineCurrentLookupKey(): Mono<Any> = forCurrentTransaction().map {
            val isReadOnly = it.isActualTransactionActive && it.isCurrentTransactionReadOnly
            if (isReadOnly) SLAVE_ROUTING_KEY else MASTER_ROUTING_KEY
        }
    }

    @Bean
    @Primary
    fun r2dbcTransactionManager(@Qualifier("connectionFactory") connectionFactory: ConnectionFactory): TransactionManager {
        return R2dbcTransactionManager(connectionFactory)
    }

    @Bean
    @Primary
    @Qualifier("connectionFactory")
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
        val url = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_R2DBC_URL")!!
        val username = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_USERNAME")!!
        val password = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_PASSWORD")!!

        if (!environment.acceptsProfiles(Profiles.of(ProfileConfigConstants.SPRING_PROFILE_DEVELOPMENT))) {
            checkDataSource(DriverManagerDataSource(url.replace("r2dbc", "jdbc"), username, password))
        }

        val driver = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DRIVER")!!
        val host = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_HOST")!!
        val port = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_PORT")!!
        val database = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DATABASE")!!
        val maxPoolSize = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_MAX_CONNECTIONS")!!.toInt()
        val connectionFactory = ConnectionFactories.get(ConnectionFactoryOptions.builder()
                .option(Option.valueOf(PROPERTY_KEY_DRIVER), driver)
                .option(Option.valueOf(PROPERTY_KEY_HOST), host)
                .option(Option.valueOf(PROPERTY_KEY_PORT), port)
                .option(Option.valueOf(PROPERTY_KEY_DATABASE), database)
                .option(Option.valueOf(PROPERTY_KEY_R2DBC_URL), url)
                .option(Option.valueOf(PROPERTY_KEY_USER), username)
                .option(Option.valueOf(PROPERTY_KEY_USERNAME), username)
                .option(Option.valueOf(PROPERTY_KEY_PASSWORD), password)
                .option(MAX_SIZE, maxPoolSize)
                .build())

        val config = ConnectionPoolConfiguration
                .builder(connectionFactory)
                .name(dataSourcePrefix + "R2dbc")
                .maxIdleTime(Duration.of(MINIMUM_IDLE.toLong(), ChronoUnit.SECONDS))
                .maxSize(maxPoolSize)
                .build()
        return ConnectionPool(config)
    }
}
