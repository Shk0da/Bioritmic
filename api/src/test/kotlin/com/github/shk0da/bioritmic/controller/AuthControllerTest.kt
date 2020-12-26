package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters

@AutoConfigureWebTestClient(timeout = "36000")
class AuthControllerTest : ApiApplicationTests() {

    private val defaultUserModel = UserModel(
        name = "Name 1",
        email = "test1@gmail.com",
        password = "12345",
        birthday = "14-01-1989"
    )

    @Test
    fun registrationTest() {
        val userModel = defaultUserModel.copy()

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id").isNotEmpty
            .jsonPath("$.name").isEqualTo(userModel.name)
            .jsonPath("$.email").isEqualTo(userModel.email)
            .jsonPath("$.birthday").isEqualTo(userModel.birthday)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().is4xxClientError
            .expectBody()
            .jsonPath("$.errors.length()").isEqualTo(1)
            .jsonPath("$.errors[0].errorCode").isEqualTo(ErrorCode.USER_EXISTS.code)
            .jsonPath("$.errors[0].message").isEqualTo(ErrorCode.USER_EXISTS.message)
    }
}