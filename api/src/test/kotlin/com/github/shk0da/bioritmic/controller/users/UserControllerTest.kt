package com.github.shk0da.bioritmic.controller.users

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.text.SimpleDateFormat
import java.util.Date
import java.util.UUID


class UserControllerTest : ApiApplicationTests() {

    private lateinit var defaultUserModel: UserModel
    private lateinit var authToken: String
    private var userId: UUID? = null

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        defaultUserModel = UserModel(
            name = "Test User",
            email = "user_test_${uniqueId}@gmail.com",
            password = "Test12345",
            birthday = "1989-01-14"
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(defaultUserModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id").exists()

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

        // Get accessToken from cache - find by email
        val auth = authTokenCache.entries.find { entry ->
            val userAuth = entry.value
            userAuth.userId != null
        }?.value
        
        userId = auth?.userId
        authToken = "Bearer ${auth?.accessToken}"
    }

    @Test
    fun getMeTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isNotEmpty
            .jsonPath("$.name").isEqualTo(defaultUserModel.name)
            .jsonPath("$.email").isEqualTo(defaultUserModel.email)
    }

    @Test
    fun updateMeTest() {
        val updatedInfo = UserInfo(
            id = null,
            name = "Updated Name",
            email = defaultUserModel.email,
            birthday = SimpleDateFormat("yyyy-MM-dd").parse("1990-01-01")
        )

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(updatedInfo))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo(updatedInfo.name!!)
    }

    @Test
    fun updateMeBioTest() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("bio" to "Тестовое описание профиля")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.bio").isEqualTo("Тестовое описание профиля")
    }

    @Test
    fun updateMeStatusTest() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "statusEmoji" to "🔥",
                "statusPosition" to "BOTTOM_LEFT"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.statusEmoji").isEqualTo("🔥")
            .jsonPath("$.statusPosition").isEqualTo("BOTTOM_LEFT")
    }

    @Test
    fun updateMeStatusRejectsUnknownEmoji() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("statusEmoji" to "🚀")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }

    @Test
    fun updateMeGenderTest() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("gender" to "WOMAN")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.gender").isEqualTo("WOMAN")

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.gender").isEqualTo("WOMAN")
    }

    @Test
    fun getMeGisTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNoContent
    }

    @Test
    fun estimateMeGisRequiresAuthTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me/gis/estimate")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun deleteMeGisTest() {
        val gis = mapOf("lat" to 55.7558, "lon" to 37.6173)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(gis))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .exchange()
            .expectStatus().isNoContent

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNoContent
    }

    @Test
    fun getMePhotoTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me/photo")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.IMAGE_JPEG)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun getUserByIdReturnsBannedFlagTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val email = "banned_profile_$suffix@gmail.com"
        var targetId = ""

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Banned User",
                "email" to email,
                "password" to "Test12345",
                "birthday" to "1990-01-01"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id")
            .value { id: Any -> targetId = id as String }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$targetId/ban")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$targetId")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.isBanned").isEqualTo(true)
    }

    @Test
    fun unverifiedUserCanSaveGisAndSearchSettings() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val unverifiedEmail = "unverified_gis_$suffix@gmail.com"

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "name" to "Unverified GIS User",
                "email" to unverifiedEmail,
                "password" to "Test12345",
                "birthday" to "1992-01-01"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        var unverifiedToken = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(unverifiedEmail, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { token: Any -> unverifiedToken = "Bearer ${token as String}" }

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, unverifiedToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.isVerified").isEqualTo(false)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, unverifiedToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("lat" to 55.7558, "lon" to 37.6173)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, unverifiedToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.lat").isEqualTo(55.7558)
            .jsonPath("$.lon").isEqualTo(37.6173)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, unverifiedToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserSettingsModel(
                gender = Gender.WOMAN,
                ageMin = 21,
                ageMax = 35,
                distance = 25.0
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.distance").isEqualTo(25.0)
    }

    @Test
    fun getUserByIdTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/00000000-0000-0000-0000-000000000001")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun getBlockedUsersTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/blocked?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun deleteMeTest() {
        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun deleteMePhotoTest() {
        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/user/me/photo")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .exchange()
            .expectStatus().isNoContent
    }
}
