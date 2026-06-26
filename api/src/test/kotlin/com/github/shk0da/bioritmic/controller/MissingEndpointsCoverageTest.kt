package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class MissingEndpointsCoverageTest : ApiApplicationTests() {

    private lateinit var aliceToken: String
    private lateinit var bobToken: String
    private var aliceId: UUID = UUID(0, 0)
    private var bobId: UUID = UUID(0, 0)

    @BeforeEach
    fun setup() {
        val uid = UUID.randomUUID().toString().substring(0, 8)
        aliceId = register("alice_extra_$uid@gmail.com", "Alice Extra")
        bobId = register("bob_extra_$uid@gmail.com", "Bob Extra")
        aliceToken = token("alice_extra_$uid@gmail.com")
        bobToken = token("bob_extra_$uid@gmail.com")
    }

    @Test
    fun `prompt endpoints are covered`() {
        val promptResponse = webTestClient.get()
            .uri("$API_WITH_VERSION_1/prompts/random?count=1")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(Map::class.java)
            .returnResult()
            .responseBody ?: emptyList()

        val promptId = (promptResponse.first()["id"] as Number).toLong()

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/prompts/answers")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "prompt_id" to promptId,
                        "answer" to "test answer"
                    )
                )
            )
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/prompts/answers")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `interest endpoints are covered`() {
        val interests = webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/interests")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(Map::class.java)
            .returnResult()
            .responseBody ?: emptyList()

        val interestId = (interests.first()["id"] as Number).toLong()

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/me/interests")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(interestId)))
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me/interests")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `story endpoints are covered`() {
        val story = webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "mediaUrl" to "https://example.org/story.jpg",
                        "caption" to "hello"
                    )
                )
            )
            .exchange()
            .expectStatus().isOk
            .expectBody(Map::class.java)
            .returnResult()
            .responseBody!!

        val storyId = (story["id"] as Number).toLong()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, bobToken)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories/$storyId/view")
            .header(HttpHeaders.AUTHORIZATION, bobToken)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `push token endpoints are covered`() {
        val request = mapOf("token" to "token-${UUID.randomUUID()}", "platform" to "android")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/push-token")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(request))
            .exchange()
            .expectStatus().isOk

        webTestClient.method(HttpMethod.DELETE)
            .uri("$API_WITH_VERSION_1/user/me/push-token")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(request))
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `verify endpoint is covered`() {
        val builder = MultipartBodyBuilder()
        val resource = object : ByteArrayResource("fake-image".toByteArray()) {
            override fun getFilename(): String = "selfie.jpg"
        }
        builder.part("photo", resource).contentType(MediaType.IMAGE_JPEG)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/verify")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
            .jsonPath("$.status").isEqualTo("PENDING")
    }

    @Test
    fun `boost subscription and report endpoints are covered`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/subscription/verify")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("receiptToken" to "receipt-1", "plan" to "PRO")))
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/boost/activate")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/boost/current")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/subscription/cancel")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/report")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "reported_user_id" to bobId.toString(),
                        "reason" to "SPAM",
                        "description" to "test report"
                    )
                )
            )
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `photo endpoints are covered`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$bobId/photos")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/photos/s3/non-existent")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .accept(MediaType.IMAGE_JPEG)
            .exchange()
            .expectStatus().isOk
    }

    private fun register(email: String, name: String): UUID {
        var id = UUID(0, 0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    UserModel(
                        name = name,
                        email = email,
                        password = "Test12345",
                        birthday = "1990-01-01"
                    )
                )
            )
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id")
            .value { value: Any -> id = UUID.fromString(value as String) }
        return id
    }

    private fun token(email: String): String {
        var access = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = email, password = "Test12345")))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { value: Any -> access = value as String }
        return "Bearer $access"
    }
}
