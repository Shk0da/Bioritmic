package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.DefaultDataSourceProfileCondition
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.IDLE_TIMEOUT
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MASTER_ROUTING_KEY
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MAX_ATTEMPT
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MAX_LIFETIME
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MINIMUM_IDLE
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_DATASOURCE
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_DRIVER_CLASS_NAME
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_MAX_CONNECTIONS
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_PASSWORD
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_R2DBC_URL
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_USERNAME
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.SLAVE_ROUTING_KEY
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.extractDatabase
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.extractHost
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.extractPort
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.getR2dbcDriver
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.max
import io.r2dbc.pool.ConnectionPool
import io.r2dbc.pool.ConnectionPoolConfiguration
import io.r2dbc.spi.ConnectionFactories
import io.r2dbc.spi.ConnectionFactory
import io.r2dbc.spi.ConnectionFactoryOptions
import io.r2dbc.spi.ValidationDepth
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Conditional
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.core.env.Environment
import org.springframework.data.r2dbc.config.AbstractR2dbcConfiguration
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories
import org.springframework.r2dbc.connection.R2dbcTransactionManager
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.transaction.ReactiveTransactionManager
import org.springframework.transaction.annotation.EnableTransactionManagement
import java.time.Duration

@Configuration
@EnableTransactionManagement
@EnableR2dbcRepositories("com.github.shk0da.bioritmic.api.repository")
@Conditional(value = [DefaultDataSourceProfileCondition::class])
class DataSourceConfiguration(
    private val environment: Environment,
) : AbstractR2dbcConfiguration() {

    companion object {
        const val transactionManager = "transactionManager"
        const val readTransactionManager = "readTransactionManager"
    }

    override fun connectionFactory() = masterConnectionFactory()

    @Primary
    @Bean("connectionFactory", "masterConnectionFactory")
    fun masterConnectionFactory(): ConnectionFactory {
        return buildConnectionFactory(MASTER_ROUTING_KEY)
    }

    @Bean("slaveConnectionFactory")
    fun slaveConnectionFactory(): ConnectionFactory {
        return buildConnectionFactory(SLAVE_ROUTING_KEY)
    }

    @Primary
    @Bean("databaseClient")
    fun databaseClient(@Qualifier("connectionFactory") connectionFactory: ConnectionFactory): DatabaseClient {
        return DatabaseClient.create(connectionFactory)
    }

    @Primary
    @Bean(transactionManager)
    fun transactionManager(@Qualifier("connectionFactory") connectionFactory: ConnectionFactory): ReactiveTransactionManager {
        return R2dbcTransactionManager(connectionFactory)
    }

    @Bean(readTransactionManager)
    fun readTransactionManager(@Qualifier("slaveConnectionFactory") slaveConnectionFactory: ConnectionFactory): ReactiveTransactionManager {
        return R2dbcTransactionManager(slaveConnectionFactory)
    }

    private fun buildConnectionFactory(dataSourcePrefix: String): ConnectionFactory {
        val url = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_R2DBC_URL")!!
        val username = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_USERNAME")!!
        val password = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_PASSWORD")!!
        val driver = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DRIVER_CLASS_NAME")!!
        val maxPoolSize = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_MAX_CONNECTIONS")!!.toInt()

        val options = ConnectionFactoryOptions.builder()
            .option(ConnectionFactoryOptions.DRIVER, getR2dbcDriver(driver))
            .option(ConnectionFactoryOptions.HOST, extractHost(url))
            .option(ConnectionFactoryOptions.PORT, extractPort(url))
            .option(ConnectionFactoryOptions.DATABASE, extractDatabase(url))
            .option(ConnectionFactoryOptions.USER, username)
            .option(ConnectionFactoryOptions.PASSWORD, password)
            .build()

        val connectionFactory = ConnectionFactories.get(options)
        val poolConfiguration = ConnectionPoolConfiguration.builder(connectionFactory)
            .name(dataSourcePrefix + "R2dbc")
            .maxSize(maxPoolSize)
            .minIdle(max(MINIMUM_IDLE, maxPoolSize / 5))
            .maxIdleTime(Duration.ofMillis(IDLE_TIMEOUT))
            .maxLifeTime(Duration.ofMillis(MAX_LIFETIME))
            .acquireRetry(MAX_ATTEMPT)
            .validationDepth(ValidationDepth.LOCAL)
            .build()
        return ConnectionPool(poolConfiguration)
    }
}
