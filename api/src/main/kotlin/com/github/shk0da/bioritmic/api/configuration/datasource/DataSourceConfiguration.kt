package com.github.shk0da.bioritmic.api.configuration.datasource

import org.slf4j.LoggerFactory
import org.springframework.jdbc.datasource.DriverManagerDataSource
import java.sql.SQLException
import java.util.concurrent.TimeUnit

interface DataSourceConfiguration {

    companion object {

        private val log = LoggerFactory.getLogger(DataSourceConfiguration::class.java)

        const val MINIMUM_IDLE = 10
        const val DB_RECONNECT_INTERVAL_IN_SECONDS = 1L
        const val MAX_ATTEMPT = 10000
        const val MASTER_ROUTING_KEY = "master"
        const val SLAVE_ROUTING_KEY = "slave"
        const val PROPERTY_KEY_DATASOURCE = "spring.datasource"
        const val PROPERTY_KEY_HOST = "host"
        const val PROPERTY_KEY_PORT = "port"
        const val PROPERTY_KEY_DATABASE = "database"
        const val PROPERTY_KEY_R2DBC_URL = "r2dbc-url"
        const val PROPERTY_KEY_JPA_URL = "jpa-url"
        const val PROPERTY_KEY_DRIVER = "driver"
        const val PROPERTY_KEY_DRIVER_CLASS_NAME = "driver-class-name"
        const val PROPERTY_KEY_USER = "user"
        const val PROPERTY_KEY_USERNAME = "username"
        const val PROPERTY_KEY_PASSWORD = "password"
        const val PROPERTY_KEY_MAX_CONNECTIONS = "max-connections"
    }

    fun checkDataSource(dataSource: DriverManagerDataSource, currentAttempt: Int = 1) {
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
