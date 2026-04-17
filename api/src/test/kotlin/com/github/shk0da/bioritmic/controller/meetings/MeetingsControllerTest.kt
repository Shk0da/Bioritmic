package com.github.shk0da.bioritmic.controller.meetings

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters

@AutoConfigureWebTestClient(timeout = "36000")
class MeetingsControllerTest : ApiApplicationTests() {

    private val defaultUserModel = UserModel(
        name = "Meetings Test User",
        email = "meetings_test@gmail.com",
        password = "12345",
        birthday = "14-01-1989"
    )

    private lateinit var authToken: String

    @BeforeEach
    fun setup() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(defaultUserModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        val authorizationModel = AuthorizationModel(
            email = defaultUserModel.email!!,
            password = defaultUserModel.password!!
        )

        val authResponse = webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(authorizationModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody(UserToken::class.java)
            .returnResult()
            .responseBody

        authToken = "Bearer ${authResponse!!.accessToken}"
    }

    @Test
    fun getMeetingsTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun createMeetingsTest() {
        val meetings = listOf(
            UserMeeting(
                userId = 2L,
                lat = 55.75,
                lon = 37.61,
                distance = 10.0
            )
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(meetings))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun deleteMeetingTest() {
        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/meetings/2")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }
}
