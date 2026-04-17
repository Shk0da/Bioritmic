package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_DEVELOPMENT
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.DefaultDataSourceProfileCondition
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.micrometer.core.instrument.MeterRegistry
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
import java.sql.SQLException
import java.util.*
import java.util.concurrent.TimeUnit.MINUTES
import java.util.concurrent.TimeUnit.SECONDS
import java.util.function.Consumer
import javax.sql.DataSource

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories("com.github.shk0da.bioritmic.api.repository")
@Conditional(value = [DefaultDataSourceProfileCondition::class])
class DataSourceConfiguration(
    private val environment: Environment,
    private val metricRegistry: MeterRegistry?,
) {

    private val log = LoggerFactory.getLogger(DataSourceConfiguration::class.java)

    companion object {
        private val CONNECTION_TIMEOUT: Long = SECONDS.toMillis(10)
        private val VALIDATION_TIMEOUT: Long = SECONDS.toMillis(5)
        private val IDLE_TIMEOUT: Long = MINUTES.toMillis(5)
        private val MAX_LIFETIME: Long = MINUTES.toMillis(30)
        const val MINIMUM_IDLE = 10
        const val DB_RECONNECT_INTERVAL_IN_SECONDS = 1L
        const val MAX_ATTEMPT = 10000
        const val MASTER_ROUTING_KEY = "master"
        const val SLAVE_ROUTING_KEY = "slave"
        const val PROPERTY_KEY_DATASOURCE = "spring.datasource"
        const val PROPERTY_KEY_JPA_URL = "jpa-url"
        const val PROPERTY_KEY_DRIVER_CLASS_NAME = "driver-class-name"
        const val PROPERTY_KEY_USERNAME = "username"
        const val PROPERTY_KEY_PASSWORD = "password"
        const val PROPERTY_KEY_MAX_CONNECTIONS = "max-connections"

        const val transactionManager = "transactionManager"
        const val jpaTransactionManager = "jpaTransactionManager"
        const val readTransactionManager = "readTransactionManager"
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

    @Primary
    @Bean("dataSource", "masterDataSource")
    @Conditional(value = [DefaultDataSourceProfileCondition::class])
    fun masterDataSource(): DataSource {
        return buildDataSource(MASTER_ROUTING_KEY)
    }

    @Bean
    @Conditional(value = [DefaultDataSourceProfileCondition::class])
    fun slaveDataSource(): DataSource {
        return buildDataSource(SLAVE_ROUTING_KEY)
    }

    @Primary
    @Bean(transactionManager, jpaTransactionManager)
    fun transactionManager(masterDataSource: DataSource) = DataSourceTransactionManager(masterDataSource)

    @Bean(readTransactionManager)
    fun readTransactionManager(slaveDataSource: DataSource) = DataSourceTransactionManager(slaveDataSource)

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

        return HikariDataSource(hikariConfig)
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
        } catch (_: SQLException) {
            val failDuration = System.currentTimeMillis() - start
            log.warn("No database connection [{}], currentAttempt={}, failDuration={}", dataSource.url, currentAttempt, failDuration)
            try {
                SECONDS.sleep(DB_RECONNECT_INTERVAL_IN_SECONDS)
            } catch (_: InterruptedException) {
                // nothing
            }
            log.warn("Attempt to re-establish the connection [{}].", dataSource.url)
            checkDataSource(dataSource, currentAttempt + 1)
        }
    }
}
