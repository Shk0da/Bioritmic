package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.sql.ResultSet
import java.util.UUID

class SwipeControllerTest : ApiApplicationTests() {

    private lateinit var authToken: String
    private lateinit var currentUserId: UUID

    @BeforeEach
    fun setup() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val email = "swipe_controller_$suffix@gmail.com"
        registerUser(email)
        authToken = authorizeUser(email)
        currentUserId = resolveCurrentUserId(authToken)
        verifyUser(currentUserId)
        setGis(authToken, 55.7558, 37.6173)
    }

    @Test
    fun `skip endpoint requires authentication`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/swipe/${UUID.randomUUID()}/skip")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `skip endpoint stores relation and excludes user from search`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val targetEmail = "skip_target_$suffix@gmail.com"
        registerUser(targetEmail)
        val targetToken = authorizeUser(targetEmail)
        val targetUserId = resolveCurrentUserId(targetToken)
        verifyUser(targetUserId)
        setGis(targetToken, 55.7560, 37.6175)
        insertPhoto(targetUserId)
        configureSearchSettings()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$targetUserId')]").exists()

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/swipe/$targetUserId/skip")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)

        assertSkipExists(currentUserId, targetUserId)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$targetUserId')]").doesNotExist()
    }

    private fun registerUser(email: String) {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "name" to "Swipe Test User",
                        "email" to email,
                        "password" to "Test12345",
                        "birthday" to "1990-01-01",
                        "gender" to "MAN"
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
    }

    private fun authorizeUser(email: String): String {
        var accessToken: String? = null
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value<Any> { accessToken = it as String }
        return "Bearer ${accessToken!!}"
    }

    private fun resolveCurrentUserId(token: String): UUID {
        var idValue = ""
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, token)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id")
            .value<Any> { idValue = it as String }
        return UUID.fromString(idValue)
    }

    private fun verifyUser(userId: UUID) {
        liquibaseDataSource.connection.use { connection ->
            connection.prepareStatement("UPDATE users SET is_verified = true WHERE id = ?").use { statement ->
                statement.setObject(1, userId)
                statement.executeUpdate()
            }
        }
    }

    private fun setGis(token: String, lat: Double, lon: Double) {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, token)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("lat" to lat, "lon" to lon)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    private fun insertPhoto(targetUserId: UUID) {
        val s3Key = "test/photos/$targetUserId/profile.jpg"
        liquibaseDataSource.connection.use { connection ->
            connection.prepareStatement(
                "INSERT INTO user_photos (user_id, photo_order, s3_key, content_type, created_at) VALUES (?, 0, ?, 'image/jpeg', NOW())"
            ).use { statement ->
                statement.setObject(1, targetUserId)
                statement.setString(2, s3Key)
                statement.executeUpdate()
            }
        }
    }

    private fun configureSearchSettings() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "gender" to "MAN",
                        "ageMin" to 18,
                        "ageMax" to 60,
                        "distance" to 50.0
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    private fun assertSkipExists(userId: UUID, otherUserId: UUID) {
        liquibaseDataSource.connection.use { connection ->
            connection.prepareStatement(
                "SELECT COUNT(*) FROM swipe_skips WHERE user_id = ? AND other_user_id = ?"
            ).use { statement ->
                statement.setObject(1, userId)
                statement.setObject(2, otherUserId)
                statement.executeQuery().use { rs: ResultSet ->
                    check(rs.next())
                    check(rs.getLong(1) == 1L) {
                        "Expected swipe_skips row for userId=$userId otherUserId=$otherUserId"
                    }
                }
            }
        }
    }
}
