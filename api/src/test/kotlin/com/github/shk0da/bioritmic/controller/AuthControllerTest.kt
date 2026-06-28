package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.RecoveryModel
import com.github.shk0da.bioritmic.api.model.user.UserToken
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.Test

import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class AuthControllerTest : ApiApplicationTests() {

    private val defaultUserModel = UserModel(
        name = "Name 1",
        email = "test1@gmail.com",
        password = "Test12345",
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
    fun firstRegisteredUserShouldBeAdminAndVerified() {
        val userModel = defaultUserModel.copy(
            email = "first_admin_${UUID.randomUUID()}@gmail.com"
        )

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

        val auth = authTokenCache.entries.find { it.value.userId != null }?.value
        val token = "Bearer ${auth?.accessToken}"

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, token)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.isVerified").isEqualTo(true)
            .jsonPath("$.role").isEqualTo(ROLE_ADMIN)
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
            password = "Test12345"
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
            .expectStatus().isOk
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
            .expectStatus().isOk
    }

    @Test
    fun resetPasswordTest() {
        val userModel = defaultUserModel.copy(email = "reset_pw_${UUID.randomUUID()}@gmail.com")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/recovery")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(RecoveryModel(email = userModel.email)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val recoveryCode = liquibaseDataSource.connection.use { connection ->
            connection.prepareStatement("SELECT recovery_code FROM users WHERE email = ?").use { statement ->
                statement.setString(1, userModel.email)
                statement.executeQuery().use { resultSet ->
                    check(resultSet.next()) { "Recovery code not found for ${userModel.email}" }
                    resultSet.getString("recovery_code")
                }
            }
        }

        val newPassword = "NewPass99"
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("code" to recoveryCode, "password" to newPassword)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = userModel.email, password = newPassword)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun resetPasswordWithInvalidCode() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("code" to "invalid-code", "password" to "NewPass99")))
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
