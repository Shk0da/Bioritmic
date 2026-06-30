package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class BiorhythmControllerTest : ApiApplicationTests() {

    private lateinit var authToken: String
    private var userId: UUID? = null
    private var otherUserId: UUID? = null

    @BeforeEach
    fun setup() {
        val uniqueId1 = UUID.randomUUID().toString().substring(0, 8)
        val uniqueId2 = UUID.randomUUID().toString().substring(0, 8)
        val email1 = "bio_test1_${uniqueId1}@gmail.com"
        val email2 = "bio_test2_${uniqueId2}@gmail.com"
        
        // Register first user
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Bio Test User 1",
                "email" to email1,
                "password" to "Test12345",
                "birthday" to "1990-01-01"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        // Register second user
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Bio Test User 2",
                "email" to email2,
                "password" to "Test12345",
                "birthday" to "1995-06-15"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        // Login as first user
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email1, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        // Get auth token
        val auth = authTokenCache.entries.find { it.value.userId != null }?.value
        userId = auth?.userId
        authToken = "Bearer ${auth?.accessToken}"
        
        // Get second user ID - login as second user
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email2, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val otherAuth = authTokenCache.entries.find {
            it.value.userId != null && it.value.userId != userId
        }?.value
        otherUserId = otherAuth?.userId
    }

    @Test
    fun `should get biorhythm detail for another user`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/biorhythm/$otherUserId/detail")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.cycles").isArray()
            .jsonPath("$.overallCompatibility").isNumber()
    }

    @Test
    fun `should return 404 for non-existent user biorhythm`() {
        val nonExistentId = UUID.fromString("99999999-9999-9999-9999-999999999999")
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/biorhythm/$nonExistentId/detail")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `should return 401 without auth token`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/biorhythm/$otherUserId/detail")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should return 400 for own profile biorhythm detail`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/biorhythm/$userId/detail")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }
}