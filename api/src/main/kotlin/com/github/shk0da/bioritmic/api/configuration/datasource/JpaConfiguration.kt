package com.github.shk0da.bioritmic.api.configuration.datasource

import com.codahale.metrics.MetricRegistry
import com.codahale.metrics.health.HealthCheckRegistry
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.MINIMUM_IDLE
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_DATASOURCE
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_DRIVER_CLASS_NAME
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_JPA_URL
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_MAX_CONNECTIONS
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_PASSWORD
import com.github.shk0da.bioritmic.api.configuration.datasource.DataSourceConfiguration.Companion.PROPERTY_KEY_USERNAME
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_DEVELOPMENT
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.DefaultDataSourceProfileCondition
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Conditional
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.core.env.Environment
import org.springframework.core.env.Profiles
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean
import org.springframework.orm.jpa.vendor.HibernateJpaDialect
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter
import org.springframework.transaction.annotation.EnableTransactionManagement
import java.lang.Math.max
import java.lang.Math.min
import java.util.Properties
import java.util.concurrent.TimeUnit.MINUTES
import java.util.concurrent.TimeUnit.SECONDS
import java.util.function.Consumer
import javax.sql.DataSource

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories("com.github.shk0da.bioritmic.api.repository.jpa")
@Conditional(value = [DefaultDataSourceProfileCondition::class])
class JpaConfiguration(private val environment: Environment,
                       private val metricRegistry: MetricRegistry?,
                       private val healthCheckRegistry: HealthCheckRegistry?) : DataSourceConfiguration {

    private val log = LoggerFactory.getLogger(JpaConfiguration::class.java)

    companion object {

        /**
         * Set the maximum number of milliseconds that a client will wait for a connection from the pool. If this
         * time is exceeded without a connection becoming available, a SQLException will be thrown from
         * [DataSource.getConnection].
         */
        private val CONNECTION_TIMEOUT: Long = SECONDS.toMillis(10)

        /**
         * Sets the maximum number of milliseconds that the pool will wait for a connection to be validated as
         * alive.
         */
        private val VALIDATION_TIMEOUT: Long = SECONDS.toMillis(5)

        /**
         * This property controls the maximum amount of time (in milliseconds) that a connection is allowed to sit
         * idle in the pool. Whether a connection is retired as idle or not is subject to a maximum variation of +30
         * seconds, and average variation of +15 seconds. A connection will never be retired as idle before this timeout.
         * A value of 0 means that idle connections are never removed from the pool.
         */
        private val IDLE_TIMEOUT: Long = MINUTES.toMillis(5)

        /**
         * This property controls the maximum lifetime of a connection in the pool. When a connection reaches this
         * timeout, even if recently used, it will be retired from the pool. An in-use connection will never be
         * retired, only when it is idle will it be removed.
         */
        private val MAX_LIFETIME: Long = MINUTES.toMillis(30)

        const val transactionManager = "transactionManager"
        const val jpaTransactionManager = "jpaTransactionManager"
    }

    @Bean(name = ["entityManagerFactory"])
    fun entityManagerFactory(@Qualifier("dataSource") dataSource: DataSource?): LocalContainerEntityManagerFactoryBean? {
        val entityManagerFactoryBean = LocalContainerEntityManagerFactoryBean()
        entityManagerFactoryBean.dataSource = dataSource!!
        entityManagerFactoryBean.setPackagesToScan("com.github.shk0da.bioritmic.api.domain")
        entityManagerFactoryBean.jpaVendorAdapter = HibernateJpaVendorAdapter()
        entityManagerFactoryBean.jpaDialect = HibernateJpaDialect()
        entityManagerFactoryBean.setJpaProperties(object : Properties() {
            init {
                val prefix = "spring.jpa.properties."
                val setProperty: Consumer<String> = Consumer<String> { name ->
                    val property = environment.getProperty(prefix + name)
                    property?.let { setProperty(name, it) }
                }
                setProperty.accept("hibernate.dialect")
                setProperty.accept("hibernate.id.new_generator_mapping")
                setProperty.accept("hibernate.id.order_updates")
                setProperty.accept("hibernate.id.order_inserts")
                setProperty.accept("hibernate.jdbc.batch_versioned_data")
                setProperty.accept("hibernate.jdbc.fetch_size")
                setProperty.accept("hibernate.jdbc.batch_size")
                setProperty.accept("hibernate.jdbc.lob.non_contextual_creation")
                setProperty.accept("hibernate.cache.use_second_level_cache")
                setProperty.accept("hibernate.cache.provider_class")
                setProperty.accept("hibernate.cache.region.factory_class")
                if (environment.acceptsProfiles(Profiles.of(SPRING_PROFILE_DEVELOPMENT))) {
                    setProperty.accept("hibernate.show_sql")
                    setProperty.accept("hibernate.use_sql_comments")
                    setProperty.accept("hibernate.format_sql")
                    setProperty.accept("hibernate.generate_statistics")
                }
            }
        })
        return entityManagerFactoryBean
    }

    @Bean
    @Primary
    @Conditional(value = [DefaultDataSourceProfileCondition::class])
    fun dataSource(): DataSource {
        val routingDataSource: RoutingDataSource
        try {
            val primaryDataSource = masterDataSource()
            val replicaDataSource = slaveDataSource()
            val targetDataSources: Map<Any, Any> = mapOf(
                    Pair(RoutingDataSource.Route.MASTER, primaryDataSource),
                    Pair(RoutingDataSource.Route.SLAVE, replicaDataSource)
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

        if (!environment.acceptsProfiles(Profiles.of(SPRING_PROFILE_DEVELOPMENT))) {
            checkDataSource(DriverManagerDataSource(url, username, password))
        }

        val driver = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DRIVER_CLASS_NAME")!!
        val maxPoolSize = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_MAX_CONNECTIONS")!!.toInt()

        val hikariConfig = HikariConfig()
        hikariConfig.poolName = dataSourcePrefix + "Jpa"
        hikariConfig.maximumPoolSize = maxPoolSize
        hikariConfig.minimumIdle = max(min(MINIMUM_IDLE, maxPoolSize), maxPoolSize / 5)
        hikariConfig.connectionTimeout = CONNECTION_TIMEOUT
        hikariConfig.validationTimeout = VALIDATION_TIMEOUT
        hikariConfig.idleTimeout = IDLE_TIMEOUT
        hikariConfig.maxLifetime = MAX_LIFETIME
        hikariConfig.jdbcUrl = url
        hikariConfig.username = username
        hikariConfig.password = password
        hikariConfig.driverClassName = driver

        if (null != metricRegistry) {
            hikariConfig.metricRegistry = metricRegistry
        }
        if (null != healthCheckRegistry) {
            hikariConfig.healthCheckRegistry = healthCheckRegistry
        }

        return HikariDataSource(hikariConfig)
    }
}
