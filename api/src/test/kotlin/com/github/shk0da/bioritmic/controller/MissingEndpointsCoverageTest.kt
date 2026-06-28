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
    fun `bio field is covered`() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("bio" to "Люблю путешествия и музыку")))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.bio").isEqualTo("Люблю путешествия и музыку")

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$aliceId")
            .header(HttpHeaders.AUTHORIZATION, bobToken)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.bio").isEqualTo("Люблю путешествия и музыку")
    }

    @Test
    fun `story endpoints are covered`() {
        val imageBytes = javaClass.classLoader.getResourceAsStream("images/no_image.png")!!.readBytes()
        val builder = MultipartBodyBuilder()
        builder.part("file", ByteArrayResource(imageBytes))
            .filename("story.png")
            .contentType(MediaType.IMAGE_PNG)
        builder.part("caption", "hello")

        val story = webTestClient.post()
            .uri("$API_WITH_VERSION_1/stories")
            .header(HttpHeaders.AUTHORIZATION, aliceToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
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
            .uri("$API_WITH_VERSION_1/bookmarks")
            .header(HttpHeaders.AUTHORIZATION, bobToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(mapOf("userId" to aliceId))))
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
            .expectStatus().isNotFound
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
