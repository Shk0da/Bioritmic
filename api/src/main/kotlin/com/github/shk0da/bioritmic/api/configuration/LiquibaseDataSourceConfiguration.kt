package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_DEVELOPMENT
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.DefaultDataSourceProfileCondition
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.CONNECTION_TIMEOUT
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.DB_RECONNECT_INTERVAL_IN_SECONDS
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.IDLE_TIMEOUT
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MASTER_ROUTING_KEY
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MAX_ATTEMPT
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MAX_LIFETIME
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MIN_IDLE_POOL_RATIO
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.MINIMUM_IDLE
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_DATASOURCE
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_DRIVER_CLASS_NAME
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_JPA_URL
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_MAX_CONNECTIONS
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_PASSWORD
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.PROPERTY_KEY_USERNAME
import com.github.shk0da.bioritmic.api.utils.DatabaseUtils.VALIDATION_TIMEOUT
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.slf4j.LoggerFactory
import org.springframework.boot.liquibase.autoconfigure.LiquibaseDataSource
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Conditional
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.core.env.Environment
import org.springframework.core.env.Profiles
import org.springframework.jdbc.datasource.DriverManagerDataSource
import java.sql.SQLException
import java.util.concurrent.TimeUnit.SECONDS
import javax.sql.DataSource

@Configuration
@Conditional(value = [DefaultDataSourceProfileCondition::class])
class LiquibaseDataSourceConfiguration(
    private val environment: Environment,
) {

    private val log = LoggerFactory.getLogger(LiquibaseDataSourceConfiguration::class.java)

    @Bean
    @Primary
    @LiquibaseDataSource
    fun liquibaseDataSource(): DataSource = buildDataSource()

    private fun buildDataSource(dataSourcePrefix: String = MASTER_ROUTING_KEY): HikariDataSource {
        val url = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_JPA_URL")!!
        val username = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_USERNAME")!!
        val password = environment.getProperty("$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_PASSWORD")!!

        if (!environment.acceptsProfiles(Profiles.of(SPRING_PROFILE_DEVELOPMENT))) {
            checkDataSource(DriverManagerDataSource(url, username, password))
        }

        val driver = environment.getProperty(
            "$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_DRIVER_CLASS_NAME"
        )!!
        val maxPoolSize = environment.getProperty(
            "$PROPERTY_KEY_DATASOURCE.$dataSourcePrefix.$PROPERTY_KEY_MAX_CONNECTIONS"
        )!!.toInt()

        val hikariConfig = HikariConfig()
        hikariConfig.poolName = dataSourcePrefix + "Jpa"
        hikariConfig.maximumPoolSize = maxPoolSize
        hikariConfig.minimumIdle = MINIMUM_IDLE.coerceAtMost(maxPoolSize)
            .coerceAtLeast(maxPoolSize / MIN_IDLE_POOL_RATIO)
        hikariConfig.connectionTimeout = CONNECTION_TIMEOUT
        hikariConfig.validationTimeout = VALIDATION_TIMEOUT
        hikariConfig.idleTimeout = IDLE_TIMEOUT
        hikariConfig.maxLifetime = MAX_LIFETIME
        hikariConfig.jdbcUrl = url
        hikariConfig.username = username
        hikariConfig.password = password
        hikariConfig.driverClassName = driver

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
            log.warn(
                "No database connection [{}], currentAttempt={}, failDuration={}",
                dataSource.url, currentAttempt, failDuration
            )
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
