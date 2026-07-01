package com.github.shk0da.bioritmic.controller.bookmarks

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID


class BookmarkControllerTest : ApiApplicationTests() {

    private lateinit var defaultUserModel: UserModel
    private lateinit var authToken: String
    private var userId: UUID? = null

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        defaultUserModel = UserModel(
            name = "Bookmark Test User",
            email = "bookmark_test_${uniqueId}@gmail.com",
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
    }

    @Test
    fun getBookmarksTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/bookmarks?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun getBookmarkLimitTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/bookmarks/limit")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.count").isEqualTo(0)
            .jsonPath("$.limit").isEqualTo(100)
    }

    @Test
    fun saveBookmarksTest() {
        val currentUserId = userId ?: throw IllegalStateException("User ID is null")
        val bookmarks = listOf(
            UserBookmark(
                userId = currentUserId,
                timestamp = System.currentTimeMillis()
            )
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(bookmarks))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun deleteBookmarkTest() {
        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/bookmarks/00000000-0000-0000-0000-000000000001")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `matches are blurred without active boost`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/bookmarks/matches")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.blurred").isEqualTo(true)
            .jsonPath("$.matches.length()").isEqualTo(0)
    }

    @Test
    fun `matches count mutual likes not bookmarks`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val currentUserId = userId ?: throw IllegalStateException("User ID is null")
        verifyUserForTests(currentUserId, grantRegistrationBonus = false)

        val otherEmail = "match_like_$suffix@gmail.com"
        val otherUserModel = UserModel(
            name = "Match Like User",
            email = otherEmail,
            password = "Test12345",
            birthday = "1990-01-01",
            acceptedUserAgreement = true,
            acceptedPersonalDataProcessing = true,
        )
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(otherUserModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        val otherAuthorization = AuthorizationModel(otherEmail, "Test12345")
        var otherAccessToken = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(otherAuthorization))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { value: Any -> otherAccessToken = value as String }
        val otherToken = "Bearer $otherAccessToken"
        var otherUserId = UUID.randomUUID()
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, otherToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id")
            .value { value: Any -> otherUserId = UUID.fromString(value as String) }
        verifyUserForTests(otherUserId, grantRegistrationBonus = false)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/swipe/$otherUserId/like")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/swipe/$currentUserId/like")
            .header(HttpHeaders.AUTHORIZATION, otherToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/boost/activate")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/bookmarks/matches")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.count").isEqualTo(1)
            .jsonPath("$.matches.length()").isEqualTo(1)
    }

    @Test
    fun `matches are visible with active boost`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/boost/activate")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/bookmarks/matches")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.blurred").isEqualTo(false)
    }
}
