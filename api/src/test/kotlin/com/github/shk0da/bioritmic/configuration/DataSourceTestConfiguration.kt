package com.github.shk0da.bioritmic.configuration

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_PG_EMBEDDED
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.DependsOn
import org.springframework.context.annotation.Primary
import org.springframework.context.annotation.Profile
import org.springframework.core.env.Environment
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.transaction.annotation.EnableTransactionManagement
import org.testcontainers.containers.PostgreSQLContainer
import javax.sql.DataSource

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories("com.github.shk0da.bioritmic.api.repository")
@Profile(value = [SPRING_PROFILE_PG_EMBEDDED])
class DataSourceTestConfiguration(private val environment: Environment) {

    private val log = LoggerFactory.getLogger(DataSourceTestConfiguration::class.java)

    @Primary
    @Bean(DataSourceConfiguration.jpaTransactionManager, DataSourceConfiguration.transactionManager)
    fun transactionManager(dataSource: DataSource) = DataSourceTransactionManager(dataSource)

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

    @Bean(destroyMethod = "stop")
    fun postgreSQLContainer(): PostgreSQLContainer<*> {
        val postgreSQLContainer: PostgreSQLContainer<*> = PostgreSQLContainer<Nothing>("postgres:12-alpine")
        postgreSQLContainer.withDatabaseName(environment.getProperty("spring.datasource.database"))
        postgreSQLContainer.withUsername(environment.getProperty("spring.datasource.username"))
        postgreSQLContainer.withPassword(environment.getProperty("spring.datasource.password"))
        postgreSQLContainer.start()
        log.debug("PostgreSQLContainer jdbcUrl: {}", postgreSQLContainer.jdbcUrl)
        log.debug("PostgreSQLContainer exposedPorts: {}", postgreSQLContainer.exposedPorts)
        return postgreSQLContainer
    }
}
