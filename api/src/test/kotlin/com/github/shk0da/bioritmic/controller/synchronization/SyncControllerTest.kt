package com.github.shk0da.bioritmic.controller.synchronization

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters


class SyncControllerTest : ApiApplicationTests() {

    private val defaultUserModel = UserModel(
        name = "Sync Test User",
        email = "sync_test@gmail.com",
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
    fun syncTest() {
        val timestamp = System.currentTimeMillis()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/sync?timestamp=$timestamp")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun syncWithOldTimestampTest() {
        val timestamp = System.currentTimeMillis() - 86400000 // 1 day ago

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/sync?timestamp=$timestamp")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }
}
