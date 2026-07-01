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
    private var adminId: UUID? = null

    private fun registerUser(email: String, name: String = "Test User"): String {
        var userId = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to name,
                "email" to email,
                "password" to "Test12345",
                "birthday" to "1990-01-01",
            "acceptedUserAgreement" to true,
            "acceptedPersonalDataProcessing" to true
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id")
            .value { id: Any -> userId = id as String }
        return userId
    }

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
                "password" to "Test12345",
                "birthday" to "1990-01-01",
            "acceptedUserAgreement" to true,
            "acceptedPersonalDataProcessing" to true
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        // Login
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
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
            .uri("$API_WITH_VERSION_1/admin/users?page=0&size=50")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.users").isArray
            .jsonPath("$.total").exists()
            .jsonPath("$.page").exists()
            .jsonPath("$.size").exists()
    }

    @Test
    fun `should ban and unban user`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val targetId = registerUser("ban_target_$suffix@gmail.com", "Ban Target")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/ban")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/users?page=0&size=50")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.users[?(@.id == '$targetId')].role").isEqualTo("ROLE_BANNED")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/unban")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
    }

    @Test
    fun `should verify and unverify user`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val targetId = registerUser("verify_target_$suffix@gmail.com", "Verify Target")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/verify")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/users?page=0&size=50")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.users[?(@.id == '$targetId')].isVerified").isEqualTo(true)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/unverify")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
    }

    @Test
    fun `should change user role from UI role names`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val targetId = registerUser("role_target_$suffix@gmail.com", "Role Target")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/role")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "MODERATOR")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
            .jsonPath("$.role").isEqualTo("MODERATOR")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/role")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "USER")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.role").isEqualTo("ROLE_USER")
    }

    @Test
    fun `should reset password for user`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val targetId = registerUser("reset_target_$suffix@gmail.com", "Reset Target")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/reset-password")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
            .jsonPath("$.userId").isEqualTo(targetId)
    }

    @Test
    fun `should delete user`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val targetId = registerUser("delete_target_$suffix@gmail.com", "Delete Target")

        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/users?page=0&size=50")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.users[?(@.id == '$targetId')]").isEmpty
    }

    @Test
    fun `should not ban admin user`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$adminId/ban")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }

    @Test
    fun `should search users by id`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val targetId = registerUser("search_target_$suffix@gmail.com", "Search Target")
        val partialId = targetId.substring(0, 8)

        webTestClient.get()
            .uri { builder ->
                builder.path("$API_WITH_VERSION_1/admin/users")
                    .queryParam("page", 0)
                    .queryParam("size", 50)
                    .queryParam("search", partialId)
                    .build()
            }
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.total").isEqualTo(1)
            .jsonPath("$.users[0].id").isEqualTo(targetId)
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
                "password" to "Test12345",
                "birthday" to "1995-06-15",
            "acceptedUserAgreement" to true,
            "acceptedPersonalDataProcessing" to true
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        // Login as regular user
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email2, "Test12345")))
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

    @Test
    fun `banned user cannot login`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val email = "banned_login_$suffix@gmail.com"
        val userId = registerUser(email, "Banned Login User")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$userId/ban")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.errors[0].errorCode").isEqualTo("API-403.2")
    }

    @Test
    fun `banned user session is terminated immediately`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val email = "banned_session_$suffix@gmail.com"
        val userId = registerUser(email, "Banned Session User")

        var accessToken = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { value: Any -> accessToken = value as String }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$userId/ban")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $accessToken")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/refresh-token")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("email" to email, "refreshToken" to "stale")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
            .expectBody()
            .jsonPath("$.errors[0].errorCode").isEqualTo("API-403.2")
    }

    @Test
    fun `change role to banned terminates session immediately`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val email = "banned_role_$suffix@gmail.com"
        val userId = registerUser(email, "Banned Role User")

        var accessToken = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { value: Any -> accessToken = value as String }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$userId/role")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "BANNED")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $accessToken")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    private fun loginToken(email: String, password: String = "Test12345"): String {
        var accessToken = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, password)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { value: Any -> accessToken = value as String }
        return "Bearer $accessToken"
    }

    @Test
    fun `moderator can access dashboard and ban user`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val moderatorEmail = "moderator_$suffix@gmail.com"
        val moderatorId = registerUser(moderatorEmail, "Moderator User")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$moderatorId/role")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "MODERATOR")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val moderatorToken = loginToken(moderatorEmail)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/dashboard")
            .header(HttpHeaders.AUTHORIZATION, moderatorToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val targetId = registerUser("moderator_ban_$suffix@gmail.com", "Ban Target")
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/ban")
            .header(HttpHeaders.AUTHORIZATION, moderatorToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
    }

    @Test
    fun `moderator cannot delete user change role or set diamonds`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val moderatorEmail = "moderator_restricted_$suffix@gmail.com"
        val moderatorId = registerUser(moderatorEmail, "Restricted Moderator")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$moderatorId/role")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "MODERATOR")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val moderatorToken = loginToken(moderatorEmail)
        val targetId = registerUser("moderator_target_$suffix@gmail.com", "Moderator Target")

        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId")
            .header(HttpHeaders.AUTHORIZATION, moderatorToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/role")
            .header(HttpHeaders.AUTHORIZATION, moderatorToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "BANNED")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/diamonds")
            .header(HttpHeaders.AUTHORIZATION, moderatorToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("balance" to 100)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `moderator cannot ban another moderator`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val moderatorEmail = "moderator_peer_$suffix@gmail.com"
        val moderatorId = registerUser(moderatorEmail, "Peer Moderator")
        val otherModeratorEmail = "moderator_peer2_$suffix@gmail.com"
        val otherModeratorId = registerUser(otherModeratorEmail, "Other Moderator")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$moderatorId/role")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "MODERATOR")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$otherModeratorId/role")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("role" to "MODERATOR")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val moderatorToken = loginToken(moderatorEmail)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$otherModeratorId/ban")
            .header(HttpHeaders.AUTHORIZATION, moderatorToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }
}