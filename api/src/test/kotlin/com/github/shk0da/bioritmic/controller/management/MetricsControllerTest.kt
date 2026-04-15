package com.github.shk0da.bioritmic.controller.management

import com.github.shk0da.bioritmic.ApiApplicationTests
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient
import org.springframework.http.MediaType

@AutoConfigureWebTestClient(timeout = "36000")
class MetricsControllerTest : ApiApplicationTests() {

    @Test
    fun metricsTest() {
        webTestClient.get()
            .uri("/management/metrics")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.metrics").isMap
    }
}
