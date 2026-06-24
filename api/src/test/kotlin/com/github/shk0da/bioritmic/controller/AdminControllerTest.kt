package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class AdminControllerTest : ApiApplicationTests() {

    private lateinit var adminToken: String
    private var adminId: Long? = null

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        val email = "admin_test_${uniqueId}@gmail.com"
        
        // Register first user (automatically becomes admin)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Admin Test User",
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

        // Get admin token
        val auth = authTokenCache.entries.find { it.value.userId != null }?.value
        adminId = auth?.userId
        adminToken = "Bearer ${auth?.accessToken}"
    }

    @Test
    fun `should get admin dashboard`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/dashboard")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalUsers").exists()
            .jsonPath("$.verifiedUsers").exists()
            .jsonPath("$.unverifiedUsers").exists()
            .jsonPath("$.pendingReports").exists()
    }

    @Test
    fun `should list all users`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/users")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$").isArray
    }

    @Test
    fun `should return 401 without auth token`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/dashboard")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should return 403 for non-admin user`() {
        // Register second user (not admin)
        val uniqueId2 = UUID.randomUUID().toString().substring(0, 8)
        val email2 = "regular_test_${uniqueId2}@gmail.com"
        
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Regular User",
                "email" to email2,
                "password" to "12345",
                "birthday" to "1995-06-15"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        // Login as regular user
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email2, "12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val regularAuth = authTokenCache.entries.find { it.value.userId != null && it.value.userId != adminId }?.value
        val regularToken = "Bearer ${regularAuth?.accessToken}"

        // Try to access admin endpoint
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/dashboard")
            .header(HttpHeaders.AUTHORIZATION, regularToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
    }
}