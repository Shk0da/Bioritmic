package com.github.shk0da.bioritmic.api.configuration.datasource

import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_DATASOURCE
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_DRIVER_CLASS_NAME
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_JPA_URL
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_MAX_CONNECTIONS
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_PASSWORD
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_USERNAME
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.DefaultDataSourceProfileCondition
import com.google.common.collect.ImmutableMap
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Conditional
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.core.env.Environment
import org.springframework.core.env.Profiles
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.transaction.annotation.EnableTransactionManagement
import javax.sql.DataSource


@Configuration
@EnableTransactionManagement
@EnableJpaRepositories("com.github.shk0da.bioritmic.api.repository.jpa")
@Conditional(value = [DefaultDataSourceProfileCondition::class])
class JpaConfiguration(private val environment: Environment) : DataSourceConfiguration {

    private val log = LoggerFactory.getLogger(DataSourceConfiguration::class.java)

    companion object {
        const val transactionManager = "transactionManager"
        const val jpaTransactionManager = "jpaTransactionManager"
    }

    @Bean
    @Primary
    fun dataSource(): DataSource {
        val routingDataSource: RoutingDataSource
        try {
            val primaryDataSource = masterDataSource()
            val replicaDataSource = slaveDataSource()
            val targetDataSources: Map<Any, Any> = ImmutableMap.of<Any, Any>(
                    RoutingDataSource.Route.MASTER, primaryDataSource,
                    RoutingDataSource.Route.SLAVE, replicaDataSource
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

    @Bean(transactionManager, jpaTransactionManager)
    fun transactionManager(dataSource: DataSource) = DataSourceTransactionManager(dataSource)

    private fun masterDataSource(): DataSource {
        return buildDataSource(DataSourceConfiguration.MASTER_ROUTING_KEY)
    }

    private fun slaveDataSource(): DataSource {
        return buildDataSource(DataSourceConfiguration.SLAVE_ROUTING_KEY)
    }

    private fun buildDataSource(dataSourcePrefix: String): HikariDataSource {
        val url = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_JPA_URL")!!
        val username = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_USERNAME")!!
        val password = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_PASSWORD")!!

        if (!environment.acceptsProfiles(Profiles.of(ProfileConfigConstants.SPRING_PROFILE_DEVELOPMENT))) {
            checkDataSource(DriverManagerDataSource(url, username, password))
        }

        val driver = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DRIVER_CLASS_NAME")!!
        val maxPoolSize = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_MAX_CONNECTIONS")!!.toInt()

        val hikariConfig = HikariConfig()
        hikariConfig.poolName = dataSourcePrefix + "Jpa"
        hikariConfig.maximumPoolSize = maxPoolSize
        hikariConfig.minimumIdle = DataSourceConfiguration.MINIMUM_IDLE
        hikariConfig.jdbcUrl = url
        hikariConfig.username = username
        hikariConfig.password = password
        hikariConfig.driverClassName = driver
        return HikariDataSource(hikariConfig)
    }
}
