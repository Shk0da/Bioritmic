package com.github.shk0da.bioritmic.api.utils

import java.util.concurrent.TimeUnit

object DatabaseUtils {

    val CONNECTION_TIMEOUT: Long = TimeUnit.SECONDS.toMillis(10)
    val VALIDATION_TIMEOUT: Long = TimeUnit.SECONDS.toMillis(5)
    val IDLE_TIMEOUT: Long = TimeUnit.MINUTES.toMillis(5)
    val MAX_LIFETIME: Long = TimeUnit.MINUTES.toMillis(30)
    const val MAX_ATTEMPT = 10000
    const val MAX_POOL_SIZE = 10
    const val MINIMUM_IDLE = 10
    const val DB_RECONNECT_INTERVAL_IN_SECONDS = 1L
    const val MASTER_ROUTING_KEY = "master"
    const val SLAVE_ROUTING_KEY = "slave"
    const val PROPERTY_KEY_DATASOURCE = "spring.datasource"
    const val PROPERTY_KEY_JPA_URL = "jpa-url"
    const val PROPERTY_KEY_R2DBC_URL = "r2dbc-url"
    const val PROPERTY_KEY_DRIVER_CLASS_NAME = "driver-class-name"
    const val PROPERTY_KEY_USERNAME = "username"
    const val PROPERTY_KEY_PASSWORD = "password"
    const val PROPERTY_KEY_MAX_CONNECTIONS = "max-connections"

    fun getR2dbcDriver(driverClassName: String): String {
        return when {
            driverClassName.contains("postgresql", ignoreCase = true) -> "postgresql"
            driverClassName.contains("mysql", ignoreCase = true) -> "mysql"
            driverClassName.contains("mariadb", ignoreCase = true) -> "mariadb"
            driverClassName.contains("h2", ignoreCase = true) -> "h2"
            else -> throw IllegalArgumentException("Unsupported driver: $driverClassName")
        }
    }

    fun extractHost(url: String): String {
        val regex = ".*:[^:]+://(?:[^@]+@)?([^:/]+)".toRegex()
        return regex.find(url)?.groupValues?.get(1) ?: "localhost"
    }

    fun extractPort(url: String): Int {
        val regex = ".*:[^:]+://(?:[^@]+@)?[^:]+:(\\d+)".toRegex()
        return regex.find(url)?.groupValues?.get(1)?.toInt() ?: 5432
    }

    fun extractDatabase(url: String): String {
        val regex = ".*:[^:]+://(?:[^@]+@)?[^/]+/([^?]+)".toRegex()
        return regex.find(url)?.groupValues?.get(1) ?: ""
    }

    fun max(a: Int, b: Int): Int = if (a > b) a else b
}
