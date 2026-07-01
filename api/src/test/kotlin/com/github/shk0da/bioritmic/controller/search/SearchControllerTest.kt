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
import java.util.UUID


class SearchControllerTest : ApiApplicationTests() {

    private lateinit var defaultUserModel: UserModel
    private lateinit var authToken: String
    private var userId: UUID? = null

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        defaultUserModel = UserModel(
            name = "Search Test User",
            email = "search_test_${uniqueId}@gmail.com",
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
        userId?.let { verifyUserForTests(it) }

        val gis = mapOf("lat" to 55.7558, "lon" to 37.6173)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(gis))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
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

    @Test
    fun searchExcludesUsersWithoutPhotoTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val lat = 55.7558
        val lon = 37.6173

        val noPhotoEmail = "no_photo_$suffix@gmail.com"
        val (noPhotoId, _) = registerNearbyUser(noPhotoEmail, lat, lon)
        verifyUserForTests(noPhotoId)

        val withPhotoEmail = "with_photo_$suffix@gmail.com"
        val (withPhotoId, _) = registerNearbyUser(withPhotoEmail, lat, lon)
        verifyUserForTests(withPhotoId)
        insertPhoto(withPhotoId)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "gender" to "MAN",
                        "ageMin" to 18,
                        "ageMax" to 50,
                        "distance" to 50.0
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        authToken = authorizeUser(defaultUserModel.email)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$noPhotoId')]").doesNotExist()
            .jsonPath("$[?(@.id == '$withPhotoId')]").exists()
    }

    @Test
    fun searchExcludesUsersWithSecondaryPhotoOnlyTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val lat = 55.7558
        val lon = 37.6173

        val secondaryOnlyEmail = "secondary_photo_$suffix@gmail.com"
        val (secondaryOnlyId, _) = registerNearbyUser(secondaryOnlyEmail, lat, lon)
        verifyUserForTests(secondaryOnlyId)
        insertPhoto(secondaryOnlyId, photoOrder = 1)

        val withProfilePhotoEmail = "profile_photo_$suffix@gmail.com"
        val (withProfilePhotoId, _) = registerNearbyUser(withProfilePhotoEmail, lat, lon)
        verifyUserForTests(withProfilePhotoId)
        insertPhoto(withProfilePhotoId, photoOrder = 0)

        configureSearchSettings()
        authToken = authorizeUser(defaultUserModel.email)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$secondaryOnlyId')]").doesNotExist()
            .jsonPath("$[?(@.id == '$withProfilePhotoId')]").exists()
    }

    @Test
    fun searchExcludesUsersWithEmptyS3KeyTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val lat = 55.7558
        val lon = 37.6173

        val emptyKeyEmail = "empty_s3_key_$suffix@gmail.com"
        val (emptyKeyId, _) = registerNearbyUser(emptyKeyEmail, lat, lon)
        verifyUserForTests(emptyKeyId)
        insertPhoto(emptyKeyId, photoOrder = 0, s3Key = "")

        val withPhotoEmail = "valid_photo_$suffix@gmail.com"
        val (withPhotoId, _) = registerNearbyUser(withPhotoEmail, lat, lon)
        verifyUserForTests(withPhotoId)
        insertPhoto(withPhotoId)

        configureSearchSettings()
        authToken = authorizeUser(defaultUserModel.email)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$emptyKeyId')]").doesNotExist()
            .jsonPath("$[?(@.id == '$withPhotoId')]").exists()
    }

    @Test
    fun searchPromotesBoostedProfilesTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val baseLat = 55.7558
        val baseLon = 37.6173

        val (closerId, _) = registerNearbyUser(
            email = "closer_$suffix@gmail.com",
            lat = baseLat + 0.001,
            lon = baseLon
        )
        verifyUserForTests(closerId)
        insertPhoto(closerId)

        val (fartherId, fartherToken) = registerNearbyUser(
            email = "farther_$suffix@gmail.com",
            lat = baseLat + 0.02,
            lon = baseLon
        )
        verifyUserForTests(fartherId)
        insertPhoto(fartherId)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "gender" to "MAN",
                        "ageMin" to 18,
                        "ageMax" to 50,
                        "distance" to 50.0
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        authToken = authorizeUser(defaultUserModel.email)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id").isEqualTo(closerId.toString())
            .jsonPath("$[1].id").isEqualTo(fartherId.toString())

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/boost/activate")
            .header(HttpHeaders.AUTHORIZATION, fartherToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id").isEqualTo(fartherId.toString())
            .jsonPath("$[1].id").isEqualTo(closerId.toString())
    }

    @Test
    fun searchExcludesBannedUsersTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val lat = 55.7558
        val lon = 37.6173

        val bannedEmail = "banned_$suffix@gmail.com"
        val (bannedId, _) = registerNearbyUser(bannedEmail, lat, lon)
        verifyUserForTests(bannedId)
        insertPhoto(bannedId)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$bannedId/ban")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "gender" to "MAN",
                        "ageMin" to 18,
                        "ageMax" to 50,
                        "distance" to 50.0
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$bannedId')]").doesNotExist()
    }

    @Test
    fun searchExcludesSkippedUsersTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val lat = 55.7558
        val lon = 37.6173

        val skippedEmail = "skipped_$suffix@gmail.com"
        val (skippedId, _) = registerNearbyUser(skippedEmail, lat, lon)
        verifyUserForTests(skippedId)
        insertPhoto(skippedId)

        configureSearchSettings()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$skippedId')]").exists()

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/swipe/$skippedId/skip")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$skippedId')]").doesNotExist()
    }

    @Test
    fun searchExcludesBookmarkedUsersTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val lat = 55.7558
        val lon = 37.6173

        val likedEmail = "liked_$suffix@gmail.com"
        val (likedId, _) = registerNearbyUser(likedEmail, lat, lon)
        verifyUserForTests(likedId)
        insertPhoto(likedId)

        configureSearchSettings()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$likedId')]").exists()

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(mapOf("userId" to likedId))))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[?(@.id == '$likedId')]").doesNotExist()
    }

    private fun registerNearbyUser(email: String, lat: Double, lon: Double): Pair<UUID, String> {
        var registeredId: UUID? = null
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "name" to "Nearby User",
                        "email" to email,
                        "password" to "Test12345",
                        "birthday" to "1990-01-01",
                        "gender" to "MAN",
                    "acceptedUserAgreement" to true,
                    "acceptedPersonalDataProcessing" to true
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id")
            .value<Any> { registeredId = UUID.fromString(it as String) }

        val token = authorizeUser(email)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .header(HttpHeaders.AUTHORIZATION, token)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("lat" to lat, "lon" to lon)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        return registeredId!! to token
    }

    private fun configureSearchSettings() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/settings")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "gender" to "MAN",
                        "ageMin" to 18,
                        "ageMax" to 50,
                        "distance" to 50.0
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    private fun authorizeUser(email: String): String {
        var accessToken: String? = null
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value<Any> { accessToken = it as String }
        return "Bearer ${accessToken!!}"
    }

    private fun insertPhoto(targetUserId: UUID, photoOrder: Int = 0, s3Key: String? = null) {
        val resolvedS3Key = s3Key ?: "test/photos/$targetUserId/profile.jpg"
        liquibaseDataSource.connection.use { connection ->
            connection.prepareStatement(
                "INSERT INTO user_photos (user_id, photo_order, s3_key, content_type, created_at) " +
                    "VALUES (?, ?, ?, 'image/jpeg', NOW())"
            ).use { statement ->
                statement.setObject(1, targetUserId)
                statement.setInt(2, photoOrder)
                statement.setString(3, resolvedS3Key)
                statement.executeUpdate()
            }
        }
    }
}
