package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.RecoveryModel
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.Test

import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters

class AuthControllerTest : ApiApplicationTests() {

    private val defaultUserModel = UserModel(
        name = "Name 1",
        email = "test1@gmail.com",
        password = "12345",
        birthday = "1989-01-14"
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

    @Test
    fun authorizationTest() {
        val userModel = defaultUserModel.copy(email = "auth_test@gmail.com")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        val authorizationModel = AuthorizationModel(
            email = userModel.email,
            password = userModel.password!!
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(authorizationModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.refreshToken").isNotEmpty
            .jsonPath("$.email").isEqualTo(userModel.email)
    }

    @Test
    fun authorizationWithInvalidPassword() {
        val userModel = defaultUserModel.copy(email = "auth_invalid@gmail.com")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        val authorizationModel = AuthorizationModel(
            email = userModel.email,
            password = "wrong_password"
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(authorizationModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().is4xxClientError
    }

    @Test
    fun authorizationWithNonExistentEmail() {
        val authorizationModel = AuthorizationModel(
            email = "nonexistent@gmail.com",
            password = "12345"
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(authorizationModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().is4xxClientError
    }

    @Test
    fun recoveryTest() {
        val userModel = defaultUserModel.copy(email = "recovery_test@gmail.com")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        val recoveryModel = RecoveryModel(email = userModel.email)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/recovery")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(recoveryModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().is5xxServerError
    }

    @Test
    fun recoveryWithNonExistentEmail() {
        val recoveryModel = RecoveryModel(email = "nonexistent@gmail.com")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/recovery")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(recoveryModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().is4xxClientError
    }

    @Test
    fun refreshTokenTest() {
        val userModel = defaultUserModel.copy(email = "refresh_test@gmail.com")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        val authorizationModel = AuthorizationModel(
            email = userModel.email,
            password = userModel.password!!
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

        val userToken = UserToken(
            name = authResponse!!.name,
            email = userModel.email,
            accessToken = authResponse.accessToken,
            refreshToken = authResponse.refreshToken,
            expireTime = authResponse.expireTime
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/refresh-token")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userToken))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.refreshToken").isNotEmpty
            .jsonPath("$.email").isEqualTo(userModel.email)
    }
}
