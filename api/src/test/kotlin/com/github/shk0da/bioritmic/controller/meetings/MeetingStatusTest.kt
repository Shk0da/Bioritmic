package com.github.shk0da.bioritmic.controller.meetings

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.testutil.testMeeting
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID
import java.sql.Timestamp
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull

class MeetingStatusTest : ApiApplicationTests() {

    private lateinit var userAToken: String
    private var userAId: UUID = UUID(0, 0)

    private lateinit var userBToken: String
    private var userBId: UUID = UUID(0, 0)

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)

        val userAEmail = "userA_${uniqueId}@gmail.com"
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserModel(name = "User A", email = userAEmail, password = "Test12345", birthday = "1990-01-14")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = userAEmail, password = "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val authA = authTokenCache.values.last { it.userId != null }
        userAId = authA.userId!!
        userAToken = "Bearer ${authA.accessToken}"

        val userBEmail = "userB_${uniqueId}@gmail.com"
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserModel(name = "User B", email = userBEmail, password = "Test12345", birthday = "1992-05-20")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = userBEmail, password = "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val authB = authTokenCache.values.last { it.userId != null && it.userId != userAId }
        userBId = authB.userId!!
        userBToken = "Bearer ${authB.accessToken}"
    }

    @Test
    fun `decline meeting changes status and hides it from list`() {
        val meeting = testMeeting(userBId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val meetingsBefore: List<UserMeeting> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult()
            .responseBody ?: emptyList()
        assertEquals(1, meetingsBefore.size, "User B should see 1 meeting")
        assertEquals(userAId, meetingsBefore[0].userId)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$userAId/decline")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val meetingsAfter: List<UserMeeting> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult()
            .responseBody ?: emptyList()
        assertEquals(0, meetingsAfter.size, "Declined meeting should NOT appear in list after reload")
    }

    @Test
    fun `accept meeting changes status in DB`() {
        val meeting = testMeeting(userBId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$userAId/accept")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].status").isEqualTo("ACCEPTED")
    }

    @Test
    fun `sender sees accepted meeting banner data on meetings page`() {
        val meeting = testMeeting(userBId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$userAId/accept")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].userId").isEqualTo(userBId.toString())
            .jsonPath("$[0].status").isEqualTo("ACCEPTED")
            .jsonPath("$[0].outgoing").isEqualTo(true)
            .jsonPath("$[0].distance").isEqualTo(10.0)
    }

    @Test
    fun `resend meeting after decline resets status to pending`() {
        val meeting = testMeeting(userBId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$userAId/decline")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].status").isEqualTo("PENDING")
    }

    @Test
    fun `self meeting is not created`() {
        val meeting = testMeeting(userAId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val meetings: List<UserMeeting> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult()
            .responseBody ?: emptyList()
        assertEquals(0, meetings.size, "Self-meeting should be filtered out")
    }

    @Test
    fun `create meeting rejects past scheduledAt`() {
        val meeting = testMeeting(
            userId = userBId,
            scheduledAt = Timestamp(System.currentTimeMillis() - 86_400_000),
        )
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, userAToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
    }
}
