package com.github.shk0da.bioritmic.controller.management

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.management.LoggerController.LoggerVM
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters

@AutoConfigureWebTestClient(timeout = "36000")
class LoggerControllerTest : ApiApplicationTests() {

    @Test
    fun logsTest() {
        webTestClient.get()
            .uri("/management/logs")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$").isArray
    }

    @Test
    fun changeLevelTest() {
        val loggerVM = LoggerVM(
            name = "com.github.shk0da.bioritmic",
            level = "DEBUG"
        )

        webTestClient.put()
            .uri("/management/logs")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(loggerVM))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNoContent
    }

    @Test
    fun changeLevelToInfoTest() {
        val loggerVM = LoggerVM(
            name = "org.springframework",
            level = "INFO"
        )

        webTestClient.put()
            .uri("/management/logs")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(loggerVM))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNoContent
    }

    @Test
    fun changeLevelToWarnTest() {
        val loggerVM = LoggerVM(
            name = "com.github.shk0da.bioritmic.api",
            level = "WARN"
        )

        webTestClient.put()
            .uri("/management/logs")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(loggerVM))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNoContent
    }
}
