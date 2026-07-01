package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.service.StoryService
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID
import java.util.concurrent.TimeUnit

class StoryControllerTest : ApiApplicationTests() {

    @Autowired
    lateinit var storyService: StoryService

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

        // Get auth token
        val auth = authTokenCache.entries.find { it.value.userId != null }?.value
        userId = auth?.userId
        authToken = "Bearer ${auth?.accessToken}"
        userId?.let { verifyUserForTests(it) }
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
    fun `should create story with image upload`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody(caption = "Test story").build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").exists()
            .jsonPath("$.mediaUrl").value<String> { url ->
                require(url.startsWith("/api/v1/photos/s3/stories/")) { "Unexpected mediaUrl: $url" }
            }
            .jsonPath("$.caption").isEqualTo("Test story")
            .jsonPath("$.locked").isEqualTo(false)
    }

    @Test
    fun `should create story without caption`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").exists()
            .jsonPath("$.mediaUrl").value<String> { url ->
                require(url.startsWith("/api/v1/photos/s3/stories/")) { "Unexpected mediaUrl: $url" }
            }
    }

    @Test
    fun `should view story`() {
        val createResponse = webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .returnResult(String::class.java)

        val storyId = createResponse.responseBody?.blockFirst()?.let { body -> 
            Regex("\"id\":(\\d+)").find(body)?.groupValues?.get(1)
        }?.toLong() ?: run {
            val feedResponse = webTestClient.get()
                .uri("$API_WITH_VERSION_1/stories")
                .header(HttpHeaders.AUTHORIZATION, authToken)
                .accept(MediaType.APPLICATION_JSON)
                .exchange()
                .returnResult(String::class.java)
            feedResponse.responseBody.blockFirst()?.let { body ->
                Regex("\"id\":(\\d+)").find(body)?.groupValues?.get(1)?.toLong()
            } ?: 0L
        }

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
    fun `should react to story`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isNumber

        var storyId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id")
            .value { id: Any -> storyId = (id as Number).toLong() }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories/$storyId/react")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("reaction" to "HEART")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reaction").isEqualTo("HEART")
            .jsonPath("$.reactionCounts.HEART").isEqualTo(1)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories/$storyId/react")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("reaction" to "HEART")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reaction").doesNotExist()
            .jsonPath("$.reactionCounts.HEART").doesNotExist()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].currentUserReaction").doesNotExist()
    }

    @Test
    fun `author can delete own story`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        var storyId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id")
            .value { id: Any -> storyId = (id as Number).toLong() }

        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/stories/$storyId")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)
    }

    @Test
    fun `should return 401 without auth token`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `should show stories only to users who bookmarked the author`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val authorEmail = "story_author_$suffix@gmail.com"
        val viewerEmail = "story_viewer_$suffix@gmail.com"

        registerUser(authorEmail, "Story Author")
        registerUser(viewerEmail, "Story Viewer")

        val authorToken = loginToken(authorEmail)
        val viewerToken = loginToken(viewerEmail)
        val authorId = userIdFromToken(authorToken)
        val viewerId = userIdFromToken(viewerToken)
        verifyUserForTests(authorId)
        verifyUserForTests(viewerId)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authorToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, viewerToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .header(HttpHeaders.AUTHORIZATION, viewerToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(mapOf("userId" to authorId))))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, viewerToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].userId").isEqualTo(authorId.toString())
    }

    @Test
    fun `author should see own story in feed without bookmark`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val authorEmail = "story_self_$suffix@gmail.com"

        registerUser(authorEmail, "Story Self")
        val authorToken = loginToken(authorEmail)
        val authorId = userIdFromToken(authorToken)
        verifyUserForTests(authorId)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authorToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authorToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].userId").isEqualTo(authorId.toString())
    }

    @Test
    fun `should reject story creation for unverified user`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val unverifiedEmail = "story_unverified_$suffix@gmail.com"

        registerUser(unverifiedEmail, "Unverified User")
        val unverifiedToken = loginToken(unverifiedEmail)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, unverifiedToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should lock and unlock own story`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        var storyId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id")
            .value { id: Any -> storyId = (id as Number).toLong() }
            .jsonPath("$[0].locked").isEqualTo(false)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/stories/$storyId/lock")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("locked" to true)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.locked").isEqualTo(true)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].locked").isEqualTo(true)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/stories/$storyId/lock")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("locked" to false)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.locked").isEqualTo(false)
            .jsonPath("$.expiresAt").exists()
    }

    @Test
    fun `should deny locking story for non-author`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val authorEmail = "story_lock_author_$suffix@gmail.com"
        val viewerEmail = "story_lock_viewer_$suffix@gmail.com"

        registerUser(authorEmail, "Story Author")
        registerUser(viewerEmail, "Story Viewer")

        val authorToken = loginToken(authorEmail)
        val viewerToken = loginToken(viewerEmail)
        verifyUserForTests(userIdFromToken(authorToken))

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authorToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        var storyId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authorToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id")
            .value { id: Any -> storyId = (id as Number).toLong() }

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/stories/$storyId/lock")
            .header(HttpHeaders.AUTHORIZATION, viewerToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("locked" to true)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun `should keep locked story in feed after expiration`() {
        val storyId = createStoryAndGetId()

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/stories/$storyId/lock")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("locked" to true)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        expireStory(storyId)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].id").isEqualTo(storyId.toInt())
            .jsonPath("$[0].locked").isEqualTo(true)
    }

    @Test
    fun `should delete expired unlocked story during cleanup`() {
        val storyId = createStoryAndGetId()
        expireStory(storyId)

        runBlocking { storyService.deleteExpiredStories() }

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)
    }

    @Test
    fun `should not delete expired locked story during cleanup`() {
        val storyId = createStoryAndGetId()

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/stories/$storyId/lock")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("locked" to true)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        expireStory(storyId)
        runBlocking { storyService.deleteExpiredStories() }

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].id").isEqualTo(storyId.toInt())
            .jsonPath("$[0].locked").isEqualTo(true)
    }

    @Test
    fun `should extend story lifetime for twelve hours when unlocked`() {
        val storyId = createStoryAndGetId()

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/stories/$storyId/lock")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("locked" to true)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        expireStory(storyId)

        var expiresAt = 0L
        val now = System.currentTimeMillis()
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/stories/$storyId/lock")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("locked" to false)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.locked").isEqualTo(false)
            .jsonPath("$.expiresAt")
            .value { value: Any -> expiresAt = (value as Number).toLong() }

        val twelveHoursMs = TimeUnit.HOURS.toMillis(12)
        val toleranceMs = TimeUnit.MINUTES.toMillis(2)
        require(expiresAt > now) { "expiresAt should be in the future after unlock" }
        require(expiresAt <= now + twelveHoursMs + toleranceMs) {
            "expiresAt should be within 12 hours after unlock, got delta=${expiresAt - now}ms"
        }
    }

    private fun createStoryAndGetId(): Long {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(storyMultipartBody().build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        var storyId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id")
            .value { id: Any -> storyId = (id as Number).toLong() }
        return storyId
    }

    private fun expireStory(storyId: Long) {
        liquibaseDataSource.connection.use { connection ->
            connection.prepareStatement(
                "UPDATE stories SET expires_at = NOW() - INTERVAL '1 hour' WHERE id = ?"
            ).use { statement ->
                statement.setLong(1, storyId)
                statement.executeUpdate()
            }
        }
    }

    private fun storyMultipartBody(caption: String? = null): MultipartBodyBuilder {
        val imageBytes = javaClass.classLoader.getResourceAsStream("images/no_image.png")!!.readBytes()
        val builder = MultipartBodyBuilder()
        builder.part("file", ByteArrayResource(imageBytes))
            .filename("story.png")
            .contentType(MediaType.IMAGE_PNG)
        if (caption != null) {
            builder.part("caption", caption)
        }
        return builder
    }

    private fun registerUser(email: String, name: String) {
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
    }

    private fun loginToken(email: String): String {
        var access = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { value: Any -> access = value as String }
        return "Bearer $access"
    }

    private fun userIdFromToken(token: String): UUID {
        val accessToken = token.removePrefix("Bearer ")
        return authTokenCache.entries
            .first { it.value.accessToken == accessToken }
            .value.userId!!
    }
}
