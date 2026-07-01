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
import java.sql.Timestamp
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
    fun getOwnUserByIdDoesNotReturnCompatibilityTest() {
        val currentUserId = userId ?: throw IllegalStateException("User ID is null")
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$currentUserId")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(currentUserId.toString())
            .jsonPath("$.compare").doesNotExist()
            .jsonPath("$.isBioCompatible").doesNotExist()
            .jsonPath("$.isHoroCompatible").doesNotExist()
    }

    @Test
    fun getMeReturnsOnlineStatusAndLastActiveAtTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.isOnline").isEqualTo(true)
            .jsonPath("$.lastActiveAt").isNotEmpty
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
    fun updateMeNickTest() {
        val nick = "test_nick_${UUID.randomUUID().toString().substring(0, 8)}"

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to nick)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.nick").isEqualTo(nick)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$nick")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.nick").isEqualTo(nick)
    }

    @Test
    fun updateMeNickRejectsDuplicateTest() {
        val nick = "dupnick_${UUID.randomUUID().toString().substring(0, 8)}"

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to nick)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val otherUser = UserModel(
            name = "Other User",
            email = "other_${UUID.randomUUID()}@gmail.com",
            password = "Test12345",
            birthday = "1990-01-01"
        )
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(otherUser))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = otherUser.email, password = otherUser.password!!)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val otherAuth = authTokenCache.entries
            .map { it.value }
            .last { it.userId != userId }
        val otherToken = "Bearer ${otherAuth.accessToken}"

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, otherToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to nick)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isEqualTo(409)
    }

    @Test
    fun updateMeNickAllowsDifferentCaseTest() {
        val base = UUID.randomUUID().toString().substring(0, 8)
        val nickLower = "nick_${base.lowercase()}"
        val nickUpper = "nick_${base.uppercase()}"

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to nickLower)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val otherUser = UserModel(
            name = "Other User",
            email = "other_${UUID.randomUUID()}@gmail.com",
            password = "Test12345",
            birthday = "1990-01-01"
        )
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(otherUser))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = otherUser.email, password = otherUser.password!!)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val otherAuth = authTokenCache.entries
            .map { it.value }
            .last { it.userId != userId }
        val otherToken = "Bearer ${otherAuth.accessToken}"

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, otherToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to nickUpper)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.nick").isEqualTo(nickUpper)
    }

    @Test
    fun updateMeNickRejectsInvalidCharactersTest() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to "bad nick!")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }

    @Test
    fun updateMeNickRejectsReservedNickTest() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to "me")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }

    @Test
    fun updateMeNickCanBeClearedTest() {
        val nick = "clear_me_${UUID.randomUUID().toString().substring(0, 8)}"

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to nick)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.nick").isEqualTo(nick)

        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("nick" to "")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.nick").doesNotExist()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$nick")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
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
    fun updateMeStatusCustomPositionTest() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "statusEmoji" to "🔥",
                "statusPosition" to "CUSTOM:42:58"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.statusEmoji").isEqualTo("🔥")
            .jsonPath("$.statusPosition").isEqualTo("CUSTOM:42:58")
    }

    @Test
    fun updateMeStatusRejectsInvalidPosition() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf(
                "statusEmoji" to "🔥",
                "statusPosition" to "CUSTOM:abc:def"
            )))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
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
                "birthday" to "1990-01-01",
                "acceptedUserAgreement" to true,
                "acceptedPersonalDataProcessing" to true,
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
    fun getUserByIdReturnsOnlineStatusAndLastActiveAtTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val email = "online_status_$suffix@gmail.com"
        var targetId = ""

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "name" to "Online Status User",
                        "email" to email,
                        "password" to "Test12345",
                        "birthday" to "1991-01-01",
                        "acceptedUserAgreement" to true,
                        "acceptedPersonalDataProcessing" to true,
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id")
            .value { id: Any -> targetId = id as String }

        val targetUuid = UUID.fromString(targetId)
        val onlineTs = Timestamp(System.currentTimeMillis() - 30_000L)
        setUserLastActiveAt(targetUuid, onlineTs)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$targetId")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.isOnline").isEqualTo(true)
            .jsonPath("$.lastActiveAt").isNotEmpty

        val offlineTs = Timestamp(System.currentTimeMillis() - 10 * 60_000L)
        setUserLastActiveAt(targetUuid, offlineTs)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$targetId")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.isOnline").isEqualTo(false)
            .jsonPath("$.lastActiveAt").isNotEmpty
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
                "birthday" to "1992-01-01",
                "acceptedUserAgreement" to true,
                "acceptedPersonalDataProcessing" to true,
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

    private fun setUserLastActiveAt(targetUserId: UUID, timestamp: Timestamp) {
        liquibaseDataSource.connection.use { connection ->
            connection.prepareStatement("UPDATE users SET last_active_at = ? WHERE id = ?").use { statement ->
                statement.setTimestamp(1, timestamp)
                statement.setObject(2, targetUserId)
                statement.executeUpdate()
            }
        }
    }
}
