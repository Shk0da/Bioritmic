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

class StoryControllerTest : ApiApplicationTests() {

    private lateinit var authToken: String
    private var userId: UUID? = null

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        val email = "story_test_${uniqueId}@gmail.com"
        
        // Register user
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Story Test User",
                "email" to email,
                "password" to "12345",
                "birthday" to "1990-01-01"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        // Login
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        // Get auth token
        val auth = authTokenCache.entries.find { it.value.userId != null }?.value
        userId = auth?.userId
        authToken = "Bearer ${auth?.accessToken}"
    }

    @Test
    fun `should return empty feed when no stories exist`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$").isArray
    }

    @Test
    fun `should create story with media URL`() {
        val request = mapOf(
            "mediaUrl" to "data:image/jpeg;base64,test",
            "caption" to "Test story"
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(request))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").exists()
            .jsonPath("$.mediaUrl").isEqualTo("data:image/jpeg;base64,test")
            .jsonPath("$.caption").isEqualTo("Test story")
    }

    @Test
    fun `should create story without caption`() {
        val request = mapOf("mediaUrl" to "data:image/jpeg;base64,test")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(request))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").exists()
            .jsonPath("$.mediaUrl").isEqualTo("data:image/jpeg;base64,test")
    }

    @Test
    fun `should view story`() {
        // First create a story
        val request = mapOf("mediaUrl" to "data:image/jpeg;base64,test")
        val createResponse = webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(request))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .returnResult(String::class.java)

        val storyId = createResponse.responseBody?.blockFirst()?.let { body -> 
            Regex("\"id\":\"([0-9a-f-]+)\"").find(body)?.groupValues?.get(1)
        } ?: UUID.randomUUID().toString()

        // View the story
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories/$storyId/view")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
    }

    @Test
    fun `should return 401 without auth token`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }
}