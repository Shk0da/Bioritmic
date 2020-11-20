package com.github.shk0da.bioritmic.api.configuration

import com.codahale.metrics.Gauge
import com.codahale.metrics.MetricRegistry
import com.codahale.metrics.Slf4jReporter
import com.codahale.metrics.health.HealthCheckRegistry
import com.codahale.metrics.jvm.*
import com.sun.management.OperatingSystemMXBean
import io.micrometer.core.aop.TimedAspect
import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.lang.management.ManagementFactory
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.concurrent.TimeUnit
import java.util.function.Supplier
import javax.annotation.PostConstruct


@Configuration
class MetricsConfiguration(
        @Value("\${management.metrics.logs.enabled:false}") private val logsEnabled: Boolean,
        @Value("\${management.metrics.logs.report-frequency:60}") private val logsReportFrequency: Int
) {

    private val log = LoggerFactory.getLogger(MetricsConfiguration::class.java)

    private val metricRegistry = MetricRegistry()
    private val healthCheckRegistry = HealthCheckRegistry()

    private val runtimeMxBean = ManagementFactory.getRuntimeMXBean()
    private val threadMxBean = ManagementFactory.getThreadMXBean()
    private val memoryUsageHeapMxBean = ManagementFactory.getMemoryMXBean().heapMemoryUsage
    private val memoryUsageNonHeapMxBean = ManagementFactory.getMemoryMXBean().nonHeapMemoryUsage
    private val operatingSystemMxBean = ManagementFactory.getOperatingSystemMXBean() as OperatingSystemMXBean

    companion object {
        private const val PROP_METRIC_REG_JVM_MEMORY = "jvm.memory"
        private const val PROP_METRIC_REG_JVM_GARBAGE = "jvm.garbage"
        private const val PROP_METRIC_REG_JVM_THREADS = "jvm.threads"
        private const val PROP_METRIC_REG_JVM_FILES = "jvm.files"
        private const val PROP_METRIC_REG_JVM_BUFFERS = "jvm.buffers"
    }

    @Bean
    fun timedAspect(meterRegistry: MeterRegistry): TimedAspect {
        return TimedAspect(meterRegistry)
    }

    @Bean
    fun metricRegistry(): MetricRegistry {
        val customMetrics: HashMap<String, Gauge<Any>> = HashMap()
        customMetrics["process.uptime"] = SimpleGauge({ runtimeMxBean.uptime })
        customMetrics["process.cpu.load"] = SimpleGauge({ operatingSystemMxBean.processCpuLoad })
        customMetrics["system.cpu.load"] = SimpleGauge({ operatingSystemMxBean.systemCpuLoad })
        customMetrics["threads.peak"] = SimpleGauge({ threadMxBean.peakThreadCount })
        customMetrics["threads.daemon"] = SimpleGauge({ threadMxBean.daemonThreadCount })
        customMetrics["threads.totalStarted"] = SimpleGauge({ threadMxBean.totalStartedThreadCount })
        customMetrics["threads"] = SimpleGauge({ threadMxBean.threadCount })
        customMetrics["heap.committed"] = SimpleGauge({ memoryUsageHeapMxBean.committed })
        customMetrics["heap.init"] = SimpleGauge({ memoryUsageHeapMxBean.init })
        customMetrics["heap.used"] = SimpleGauge({ memoryUsageHeapMxBean.used })
        customMetrics["heap"] = SimpleGauge({ memoryUsageHeapMxBean.max })
        customMetrics["heap.used.percent"] = SimpleGauge({ getPercent(memoryUsageHeapMxBean.max, memoryUsageHeapMxBean.used) })
        customMetrics["non_heap.committed"] = SimpleGauge({ memoryUsageNonHeapMxBean.committed })
        customMetrics["non_heap.init"] = SimpleGauge({ memoryUsageNonHeapMxBean.init })
        customMetrics["non_heap.used"] = SimpleGauge({ memoryUsageNonHeapMxBean.used })
        customMetrics["non_heap"] = SimpleGauge({ memoryUsageNonHeapMxBean.max })
        customMetrics["free.physical.memory.size"] = SimpleGauge({ operatingSystemMxBean.freePhysicalMemorySize })
        customMetrics["total.physical.memory.size"] = SimpleGauge({ operatingSystemMxBean.totalPhysicalMemorySize })
        customMetrics["free.physical.memory.percent"] = SimpleGauge({ getPercent(operatingSystemMxBean.totalPhysicalMemorySize, operatingSystemMxBean.freePhysicalMemorySize) })

        customMetrics.forEach { (key, value) -> metricRegistry.gauge(key) { value } }

        return metricRegistry
    }

    @Bean
    fun healthCheckRegistry(): HealthCheckRegistry {
        return healthCheckRegistry
    }

    @PostConstruct
    fun init() {
        log.debug("Registering JVM gauges")
        metricRegistry.register(PROP_METRIC_REG_JVM_MEMORY, MemoryUsageGaugeSet())
        metricRegistry.register(PROP_METRIC_REG_JVM_GARBAGE, GarbageCollectorMetricSet())
        metricRegistry.register(PROP_METRIC_REG_JVM_THREADS, ThreadStatesGaugeSet())
        metricRegistry.register(PROP_METRIC_REG_JVM_FILES, FileDescriptorRatioGauge())
        metricRegistry.register(PROP_METRIC_REG_JVM_BUFFERS, BufferPoolMetricSet(ManagementFactory.getPlatformMBeanServer()))
        if (logsEnabled) {
            log.info("Initializing Metrics Log reporting")
            val reporter = Slf4jReporter.forRegistry(metricRegistry)
                    .outputTo(LoggerFactory.getLogger("metrics"))
                    .convertRatesTo(TimeUnit.SECONDS)
                    .convertDurationsTo(TimeUnit.MILLISECONDS)
                    .build()
            reporter.start(logsReportFrequency.toLong(), TimeUnit.SECONDS)
        }
    }

    class SimpleGauge<T>(private val supplier: Supplier<T>) : Gauge<Any> {

        companion object {
            private val log = LoggerFactory.getLogger(SimpleGauge::class.java)
        }

        override fun getValue(): T? {
            var result: T? = null
            try {
                result = supplier.get()
            } catch (var3: Exception) {
                log.error("Fail to get Gauge!", var3)
            }
            return result
        }
    }

    private fun getPercent(max: Long, used: Long): Double? {
        var truncatedDouble: Double? = null
        if (max != 0L && used != 0L) {
            truncatedDouble = BigDecimal.valueOf(used.toDouble() / max.toDouble()).setScale(3, RoundingMode.HALF_UP).toDouble()
        }
        return truncatedDouble
    }
}