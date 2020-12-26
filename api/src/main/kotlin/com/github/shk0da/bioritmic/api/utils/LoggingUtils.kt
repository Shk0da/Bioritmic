package com.github.shk0da.bioritmic.api.utils

import org.slf4j.LoggerFactory
import org.slf4j.MDC

object LoggingUtils {

    private val log = LoggerFactory.getLogger(LoggingUtils::class.java)

    enum class Level {
        INFO, DEBUG, ERROR, WARN, TRACE
    }

    fun logWithErrorCode(level: Level?, errorCode: String?, message: String?, vararg args: Any?) {
        logWithIdKey(level, "errorCode", errorCode, message, *args)
    }

    fun logWithIdKey(level: Level?, idKey: String?, value: String?, message: String?, vararg args: Any?) {
        MDC.put(idKey, value)
        when (level) {
            Level.INFO -> log.info(message, *args)
            Level.DEBUG -> log.debug(message, *args)
            Level.ERROR -> log.error(message, *args)
            Level.WARN -> log.warn(message, *args)
            Level.TRACE -> log.trace(message, *args)
            else -> {}
        }
        MDC.remove(idKey)
    }
}