package com.github.shk0da.bioritmic.api.configuration

import ch.qos.logback.classic.AsyncAppender
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.boolex.OnMarkerEvaluator
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.classic.spi.LoggerContextListener
import ch.qos.logback.core.filter.EvaluatorFilter
import ch.qos.logback.core.spi.ContextAwareBase
import ch.qos.logback.core.spi.FilterReply
import net.logstash.logback.appender.LogstashTcpSocketAppender
import net.logstash.logback.encoder.LogstashEncoder
import net.logstash.logback.stacktrace.ShortenedThrowableConverter
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import java.net.InetSocketAddress

@Configuration
class LoggingConfiguration(@Value("\${spring.application.name}") private val appName: String,
                           @Value("\${server.port}") private val serverPort: String,
                           @Value("\${info.project.version:}") private val version: String,
                           @Value("\${management.logging.logstash.enabled:false}") logstashEnabled: Boolean,
                           @Value("\${management.logging.logstash.host:localhost}") private val logstashHost: String,
                           @Value("\${management.logging.logstash.port:5000}") private val logstashPort: Int,
                           @Value("\${management.logging.logstash.queue-size:512}") private val logstashQueueSize: Int,
                           @Value("\${management.metrics.logs.enabled:false}") logsEnabled: Boolean) {

    private val log = LoggerFactory.getLogger(LoggingConfiguration::class.java)
    private val context = LoggerFactory.getILoggerFactory() as LoggerContext

    companion object {
        private const val LOGSTASH_APPENDER_NAME = "LOGSTASH"
        private const val ASYNC_LOGSTASH_APPENDER_NAME = "ASYNC_LOGSTASH"
    }

    init {
        if (logstashEnabled) {
            addLogstashAppender(context)
            addContextListener(context)
        }
        if (logsEnabled) {
            setMetricsMarkerLogbackFilter(context)
        }
    }

    private fun addContextListener(context: LoggerContext) {
        val loggerContextListener = LogbackLoggerContextListener()
        loggerContextListener.context = context
        context.addListener(loggerContextListener)
    }

    private fun addLogstashAppender(context: LoggerContext) {
        log.info("Initializing Logstash logging")
        val logstashAppender = LogstashTcpSocketAppender()
        logstashAppender.name = LOGSTASH_APPENDER_NAME
        logstashAppender.context = context
        val optionalFields = ""
        val customFields =
                "{\"app_name\":\"" + appName + "\"," +
                "\"app_port\":\"" + serverPort + "\"," +
                optionalFields +
                "\"version\":\"" + version + "\"}"

        // More documentation is available at: https://github.com/logstash/logstash-logback-encoder
        val logstashEncoder = LogstashEncoder()
        // Set the Logstash appender config from IPC Cloud Config properties
        logstashEncoder.customFields = customFields
        // Set the Logstash appender config from IPC Cloud Config properties
        logstashAppender.addDestinations(
                InetSocketAddress(logstashHost, logstashPort)
        )
        val throwableConverter = ShortenedThrowableConverter()
        throwableConverter.isRootCauseFirst = true
        logstashEncoder.throwableConverter = throwableConverter
        logstashEncoder.customFields = customFields
        logstashAppender.encoder = logstashEncoder
        logstashAppender.start()

        // Wrap the appender in an Async appender for performance
        val asyncLogstashAppender = AsyncAppender()
        asyncLogstashAppender.context = context
        asyncLogstashAppender.name = ASYNC_LOGSTASH_APPENDER_NAME
        asyncLogstashAppender.queueSize = logstashQueueSize
        asyncLogstashAppender.addAppender(logstashAppender)
        asyncLogstashAppender.start()
        context.getLogger("ROOT").addAppender(asyncLogstashAppender)
    }

    // Configure a log filter to remove "metrics" logs from all appenders except the "LOGSTASH" appender
    private fun setMetricsMarkerLogbackFilter(context: LoggerContext) {
        log.info("Filtering metrics logs from all appenders except the {} appender", LOGSTASH_APPENDER_NAME)
        val onMarkerMetricsEvaluator = OnMarkerEvaluator()
        onMarkerMetricsEvaluator.context = context
        onMarkerMetricsEvaluator.addMarker("metrics")
        onMarkerMetricsEvaluator.start()
        val metricsFilter = EvaluatorFilter<ILoggingEvent>()
        metricsFilter.context = context
        metricsFilter.evaluator = onMarkerMetricsEvaluator
        metricsFilter.onMatch = FilterReply.DENY
        metricsFilter.start()
        for (logger in context.loggerList) {
            val it = logger.iteratorForAppenders()
            while (it.hasNext()) {
                val appender = it.next()
                if (appender.name != ASYNC_LOGSTASH_APPENDER_NAME) {
                    log.debug("Filter metrics logs from the {} appender", appender.name)
                    appender.context = context
                    appender.addFilter(metricsFilter)
                    appender.start()
                }
            }
        }
    }

    /**
     * Logback configuration is achieved by configuration file and API.
     * When configuration file change is detected, the configuration is reset.
     * This listener ensures that the programmatic configuration is also re-applied after reset.
     */
    internal inner class LogbackLoggerContextListener : ContextAwareBase(), LoggerContextListener {
        override fun isResetResistant(): Boolean {
            return true
        }

        override fun onStart(context: LoggerContext) {
            addLogstashAppender(context)
        }

        override fun onReset(context: LoggerContext) {
            addLogstashAppender(context)
        }

        override fun onStop(context: LoggerContext) {
            // Nothing to do.
        }

        override fun onLevelChange(logger: Logger, level: Level) {
            // Nothing to do.
        }
    }
}