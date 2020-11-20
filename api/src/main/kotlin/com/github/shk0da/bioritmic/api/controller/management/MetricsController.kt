package com.github.shk0da.bioritmic.api.controller.management

import com.codahale.metrics.Metric
import com.codahale.metrics.MetricRegistry
import com.github.shk0da.bioritmic.api.configuration.MetricsConfiguration.SimpleGauge
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import io.micrometer.core.instrument.MeterRegistry
import org.springframework.boot.actuate.metrics.MetricsEndpoint
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(path = ["/management"])
class MetricsController(private val metricRegistry: MetricRegistry,
                        private val meterRegistry: MeterRegistry,
                        private val metricsEndpoint: MetricsEndpoint) {

    data class MetricsResponse(var metrics: Map<String, Metric>) : BasicPresentation

    @GetMapping("/metrics")
    fun metrics(): MetricsResponse {
        val metrics = HashMap<String, Metric>(metricRegistry.metrics)
        meterRegistry.meters.forEach {
            it.id.tags.forEach { tag ->
                val metricName = "${tag.key}:${tag.value}"
                metrics["${it.id.name}.$metricName"] = SimpleGauge {
                    metricsEndpoint.metric(it.id.name, arrayListOf(metricName))
                }
            }

        }
        return MetricsResponse(metrics)
    }
}