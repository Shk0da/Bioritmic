package com.github.shk0da.bioritmic.controller.users

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID


class SettingsControllerTest : ApiApplicationTests() {

    private lateinit var defaultUserModel: UserModel
    private lateinit var authToken: String
    private var userId: Long? = null

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        defaultUserModel = UserModel(
            name = "Settings Test User",
            email = "settings_test_${uniqueId}@gmail.com",
            password = "12345",
            birthday = "1989-01-14"
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(defaultUserModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        val authorizationModel = AuthorizationModel(
            email = defaultUserModel.email,
            password = defaultUserModel.password!!
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(authorizationModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        // Get accessToken from cache
        val auth = authTokenCache.values.find { it.userId != null }
        userId = auth?.userId
        authToken = "Bearer ${auth?.accessToken}"
    }

    @Test
    fun getSettingsTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun updateSettingsTest() {
        val settings = UserSettingsModel(
            gender = Gender.MAN,
            ageMin = 20,
            ageMax = 40,
            distance = 20.0
        )

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(settings))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun patchSettingsTest() {
        val settings = UserSettingsModel(
            gender = Gender.WOMAN,
            ageMin = 25,
            ageMax = 45,
            distance = 50.0
        )

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(settings))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }
}
