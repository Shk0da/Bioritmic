package com.github.shk0da.bioritmic.configuration

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_PG_EMBEDDED
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.IDLE_TIMEOUT
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MAX_ATTEMPT
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MAX_LIFETIME
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MAX_POOL_SIZE
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MINIMUM_IDLE
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.extractDatabase
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.extractHost
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.extractPort
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.getR2dbcDriver
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.max
import io.r2dbc.pool.ConnectionPool
import io.r2dbc.pool.ConnectionPoolConfiguration
import io.r2dbc.spi.ConnectionFactory
import io.r2dbc.spi.ConnectionFactoryOptions
import io.r2dbc.spi.ValidationDepth
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.liquibase.autoconfigure.LiquibaseDataSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.DependsOn
import org.springframework.context.annotation.Primary
import org.springframework.context.annotation.Profile
import org.springframework.core.env.Environment
import org.springframework.data.r2dbc.config.AbstractR2dbcConfiguration
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.r2dbc.connection.R2dbcTransactionManager
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.transaction.ReactiveTransactionManager
import org.springframework.transaction.annotation.EnableTransactionManagement
import org.testcontainers.containers.PostgreSQLContainer
import java.time.Duration

@Configuration
@EnableTransactionManagement
@EnableR2dbcRepositories("com.github.shk0da.bioritmic.api.repository")
@Profile(value = [SPRING_PROFILE_PG_EMBEDDED])
class DataSourceTestConfiguration(
    private val environment: Environment,
) : AbstractR2dbcConfiguration() {

    private val log = LoggerFactory.getLogger(DataSourceTestConfiguration::class.java)

    @Bean
    @Primary
    @LiquibaseDataSource
    fun liquibaseDataSource(): DriverManagerDataSource {
        val postgreSQLContainer: PostgreSQLContainer<*> = postgreSQLContainer()
        val dataSource = DriverManagerDataSource()
        dataSource.setDriverClassName(postgreSQLContainer.driverClassName)
        dataSource.url = postgreSQLContainer.jdbcUrl
        dataSource.username = postgreSQLContainer.username
        dataSource.password = postgreSQLContainer.password
        return dataSource
    }

    @Primary
    @Bean("connectionFactory")
    @DependsOn("postgreSQLContainer")
    override fun connectionFactory(): ConnectionFactory {
        val liquibaseDataSource: DriverManagerDataSource = liquibaseDataSource()
        return buildConnectionFactory(liquibaseDataSource)
    }

    @Primary
    @Bean("databaseClient")
    fun databaseClient(@Qualifier("connectionFactory") connectionFactory: ConnectionFactory): DatabaseClient {
        return DatabaseClient.create(connectionFactory)
    }

    @Primary
    @Bean(DataSourceConfiguration.transactionManager)
    fun transactionManager(
        @Qualifier("connectionFactory") connectionFactory: ConnectionFactory
    ): ReactiveTransactionManager {
        return R2dbcTransactionManager(connectionFactory)
    }

    @Bean(DataSourceConfiguration.readTransactionManager)
    fun readTransactionManager(
        @Qualifier("connectionFactory") connectionFactory: ConnectionFactory
    ): ReactiveTransactionManager {
        return R2dbcTransactionManager(connectionFactory)
    }

    @Bean(destroyMethod = "stop")
    fun postgreSQLContainer(): PostgreSQLContainer<*> {
        val postgreSQLContainer: PostgreSQLContainer<*> = PostgreSQLContainer<Nothing>("postgres:12-alpine")
        postgreSQLContainer.withDatabaseName(
            environment.getProperty("app.datasource.database")
                ?: environment.getProperty("spring.datasource.master.database")
                ?: "bioritmic"
        )
        postgreSQLContainer.withUsername(
            environment.getProperty("app.datasource.username")
                ?: environment.getProperty("spring.datasource.master.username")
                ?: "postgres"
        )
        postgreSQLContainer.withPassword(
            environment.getProperty("app.datasource.password")
                ?: environment.getProperty("spring.datasource.master.password")
                ?: "postgres"
        )
        postgreSQLContainer.start()
        log.debug("PostgreSQLContainer jdbcUrl: {}", postgreSQLContainer.jdbcUrl)
        log.debug("PostgreSQLContainer exposedPorts: {}", postgreSQLContainer.exposedPorts)
        return postgreSQLContainer
    }

    private fun buildConnectionFactory(liquibaseDataSource: DriverManagerDataSource): ConnectionFactory {
        val url = liquibaseDataSource.url!!
        val username = liquibaseDataSource.username!!
        val password = liquibaseDataSource.password!!
        val driver = "org.postgresql.Driver"

        val options = ConnectionFactoryOptions.builder()
            .option(ConnectionFactoryOptions.DRIVER, getR2dbcDriver(driver))
            .option(ConnectionFactoryOptions.HOST, extractHost(url))
            .option(ConnectionFactoryOptions.PORT, extractPort(url))
            .option(ConnectionFactoryOptions.DATABASE, extractDatabase(url))
            .option(ConnectionFactoryOptions.USER, username)
            .option(ConnectionFactoryOptions.PASSWORD, password)
            .build()

        val connectionFactory = io.r2dbc.spi.ConnectionFactories.get(options)
        val poolConfiguration = ConnectionPoolConfiguration.builder(connectionFactory)
            .minIdle(max(MINIMUM_IDLE, MAX_POOL_SIZE / 5))
            .maxIdleTime(Duration.ofMillis(IDLE_TIMEOUT))
            .maxLifeTime(Duration.ofMillis(MAX_LIFETIME))
            .acquireRetry(MAX_ATTEMPT)
            .validationDepth(ValidationDepth.LOCAL)
            .build()
        return ConnectionPool(poolConfiguration)
    }
}
