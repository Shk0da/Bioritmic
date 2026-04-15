package com.github.shk0da.bioritmic.controller.errors

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.ERROR_PATH
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient
import org.springframework.http.MediaType

@AutoConfigureWebTestClient(timeout = "36000")
class ApiErrorControllerTest : ApiApplicationTests() {

    @Test
    fun handleResourceNotFoundExceptionForGet() {
        webTestClient.get()
            .uri(ERROR_PATH)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.errors").isArray
            .jsonPath("$.errors[0].errorCode").isNotEmpty
            .jsonPath("$.errors[0].message").isNotEmpty
    }

    @Test
    fun handleResourceNotFoundExceptionForPost() {
        webTestClient.post()
            .uri(ERROR_PATH)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.errors").isArray
    }

    @Test
    fun handleResourceNotFoundExceptionForPut() {
        webTestClient.put()
            .uri(ERROR_PATH)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.errors").isArray
    }

    @Test
    fun handleResourceNotFoundExceptionForDelete() {
        webTestClient.delete()
            .uri(ERROR_PATH)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.errors").isArray
    }

    @Test
    fun handleResourceNotFoundExceptionForHead() {
        webTestClient.head()
            .uri(ERROR_PATH)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun handleResourceNotFoundExceptionForNonExistentPath() {
        webTestClient.get()
            .uri("/api/v1/non-existent-path")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
            .expectBody()
            .jsonPath("$.errors").isArray
    }
}
