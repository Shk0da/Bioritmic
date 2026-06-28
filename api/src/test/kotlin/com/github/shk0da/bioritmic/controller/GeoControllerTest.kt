package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class GeoControllerTest : ApiApplicationTests() {

    @Test
    fun geoEndpointsRequireAuthTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/geo/countries")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/geo/places?country=RU&q=Мос")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/geo/reverse?lat=55.75&lon=37.61")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun countriesReturnsListForAuthenticatedUserTest() {
        val authToken = registerUser()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/geo/countries")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].code").isEqualTo("RU")
            .jsonPath("$[0].name").isEqualTo("Россия")
    }

    private fun registerUser(): String {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        val userModel = UserModel(
            name = "Geo Test User",
            email = "geo_test_${uniqueId}@gmail.com",
            password = "Test12345",
            birthday = "1989-01-14"
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(userModel.email, userModel.password!!)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val auth = authTokenCache.entries.firstOrNull()?.value
        return "Bearer ${auth?.accessToken}"
    }
}
