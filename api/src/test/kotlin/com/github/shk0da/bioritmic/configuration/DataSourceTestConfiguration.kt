package com.github.shk0da.bioritmic.configuration

import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration
import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration
import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_PG_EMBEDDED
import io.r2dbc.spi.ConnectionFactories
import io.r2dbc.spi.ConnectionFactory
import io.r2dbc.spi.ConnectionFactoryOptions
import io.r2dbc.spi.Option
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.*
import org.springframework.core.env.Environment
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.r2dbc.connection.R2dbcTransactionManager
import org.springframework.transaction.annotation.EnableTransactionManagement
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.containers.PostgreSQLR2DBCDatabaseContainer
import javax.sql.DataSource

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories("com.github.shk0da.bioritmic.api.repository.jpa")
@EnableR2dbcRepositories("com.github.shk0da.bioritmic.api.repository.r2dbc")
@Profile(value = [SPRING_PROFILE_PG_EMBEDDED])
class DataSourceTestConfiguration(private val environment: Environment) {

    private val log = LoggerFactory.getLogger(DataSourceTestConfiguration::class.java)

    @Bean(JpaConfiguration.jpaTransactionManager, JpaConfiguration.transactionManager)
    fun transactionManager(dataSource: DataSource) = DataSourceTransactionManager(dataSource)

    @Primary
    @Bean(R2dbcConfiguration.r2dbcTransactionManager)
    fun r2dbcTransactionManager(@Qualifier("connectionFactory") connectionFactory: ConnectionFactory) =
        R2dbcTransactionManager(connectionFactory)

    @Bean
    @Primary
    @DependsOn("postgreSQLContainer")
    fun dataSource(postgreSQLContainer: PostgreSQLContainer<*>): DriverManagerDataSource {
        val dataSource = DriverManagerDataSource()
        dataSource.setDriverClassName(postgreSQLContainer.driverClassName)
        dataSource.url = postgreSQLContainer.jdbcUrl
        dataSource.username = postgreSQLContainer.username
        dataSource.password = postgreSQLContainer.password
        return dataSource
    }

    @Bean
    @Primary
    @Qualifier("connectionFactory")
    @DependsOn("postgreSQLContainer")
    fun connectionFactory(postgreSQLContainer: PostgreSQLContainer<*>): ConnectionFactory {
        val host = postgreSQLContainer.host
        val port = postgreSQLContainer.firstMappedPort
        val username = postgreSQLContainer.username
        val password = postgreSQLContainer.password
        val databaseName = postgreSQLContainer.databaseName
        val driver = environment.getProperty("spring.datasource.driver")!!
        val driverClassName = postgreSQLContainer.driverClassName
        log.debug("ConnectionFactory port: {}", port)
        return ConnectionFactories.get(
            ConnectionFactoryOptions.builder()
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_HOST), host)
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_PORT), port)
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_USER), username)
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_USERNAME), username)
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_PASSWORD), password)
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_DATABASE), databaseName)
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_DRIVER), driver)
                .option(Option.valueOf(DataSourceConfiguration.PROPERTY_KEY_DRIVER_CLASS_NAME), driverClassName)
                .build()
        )
    }

    @Bean(destroyMethod = "stop")
    fun postgreSQLContainer(): PostgreSQLContainer<*> {
        val postgreSQLContainer: PostgreSQLContainer<*> = PostgreSQLContainer<Nothing>("postgres:12-alpine")
        postgreSQLContainer.withDatabaseName(environment.getProperty("spring.datasource.database"))
        postgreSQLContainer.withUsername(environment.getProperty("spring.datasource.username"))
        postgreSQLContainer.withPassword(environment.getProperty("spring.datasource.password"))
        PostgreSQLR2DBCDatabaseContainer(postgreSQLContainer).start()
        log.debug("PostgreSQLContainer jdbcUrl: {}", postgreSQLContainer.jdbcUrl)
        log.debug("PostgreSQLContainer exposedPorts: {}", postgreSQLContainer.exposedPorts)
        return postgreSQLContainer
    }
}