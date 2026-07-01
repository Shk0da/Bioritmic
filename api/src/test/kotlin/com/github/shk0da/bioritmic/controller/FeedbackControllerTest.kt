package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.domain.FeedbackStatus
import com.github.shk0da.bioritmic.api.domain.FeedbackTopic
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.client.MultipartBodyBuilder
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class FeedbackControllerTest : ApiApplicationTests() {

    private lateinit var userToken: String
    private lateinit var adminToken: String

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        val adminEmail = "admin_fb_$uniqueId@test.com"
        val userEmail = "user_fb_$uniqueId@test.com"

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Admin User",
                "email" to adminEmail,
                "password" to "Test12345",
                "birthday" to "1990-01-01",
            "acceptedUserAgreement" to true,
            "acceptedPersonalDataProcessing" to true
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Feedback User",
                "email" to userEmail,
                "password" to "Test12345",
                "birthday" to "1995-05-05",
            "acceptedUserAgreement" to true,
            "acceptedPersonalDataProcessing" to true
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        adminToken = loginToken(adminEmail)
        userToken = loginToken(userEmail)
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

    @Test
    fun `should submit feedback and list in admin panel`() {
        val builder = MultipartBodyBuilder()
        builder.part("topic", FeedbackTopic.BUG)
        builder.part("message", "Приложение зависает при отправке встречи")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/feedback")
            .header(HttpHeaders.AUTHORIZATION, userToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").exists()
            .jsonPath("$.status").isEqualTo(FeedbackStatus.NEW)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/feedback?status=NEW")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.items").isArray
            .jsonPath("$.items[0].topic").isEqualTo(FeedbackTopic.BUG)
            .jsonPath("$.items[0].status").isEqualTo(FeedbackStatus.NEW)
            .jsonPath("$.total").isEqualTo(1)
    }

    @Test
    fun `admin should update feedback status and delete`() {
        val builder = MultipartBodyBuilder()
        builder.part("topic", FeedbackTopic.SUGGESTION)
        builder.part("message", "Добавьте тёмную тему по расписанию")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/feedback")
            .header(HttpHeaders.AUTHORIZATION, userToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isNumber
            .jsonPath("$.status").isEqualTo(FeedbackStatus.NEW)

        var feedbackId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/feedback?status=NEW")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.items[0].id")
            .value { id: Any -> feedbackId = (id as Number).toLong() }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/feedback/$feedbackId/status")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("status" to FeedbackStatus.PROCESSED)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.status").isEqualTo(FeedbackStatus.PROCESSED)

        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/admin/feedback/$feedbackId")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/feedback")
            .header(HttpHeaders.AUTHORIZATION, adminToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.total").isEqualTo(0)
    }
}
