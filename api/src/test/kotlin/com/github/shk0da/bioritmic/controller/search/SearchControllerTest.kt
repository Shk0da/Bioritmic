package com.github.shk0da.bioritmic.controller.search

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.text.SimpleDateFormat


class SearchControllerTest : ApiApplicationTests() {

    private val defaultUserModel = UserModel(
        name = "Search Test User",
        email = "search_test@gmail.com",
        password = "12345",
        birthday = "1989-01-14"
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

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(authorizationModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        // Get accessToken from cache
        val auth = authTokenCache.values.first()
        authToken = "Bearer ${auth.accessToken}"
    }

    @Test
    fun searchTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun searchWithCustomFilterTest() {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd")
        val birthdate = dateFormat.parse("1989-01-14")

        val userSearch = UserSearch(
            gender = Gender.MAN,
            ageMin = 20,
            ageMax = 40,
            distance = 10.0,
            birthdate = birthdate
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userSearch))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }
}
