package com.github.shk0da.bioritmic.controller.meetings

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.mailbox.MeetingSystemMailMessages
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.testutil.MeetingTestUsers
import com.github.shk0da.bioritmic.testutil.registerMeetingTestUsers
import com.github.shk0da.bioritmic.testutil.testMeeting
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue

class MeetingsAllPathsTest : ApiApplicationTests() {

    private lateinit var users: MeetingTestUsers

    @BeforeEach
    fun setup() {
        users = registerMeetingTestUsers()
    }

    private fun sendMeeting(fromToken: String, toUserId: UUID) {
        val meeting = testMeeting(toUserId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, fromToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `GET meetings requires authentication`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `GET meetings returns empty list for new user`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)
    }

    @Test
    fun `GET meetings returns incoming pending meeting for recipient`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].userId").isEqualTo(users.userAId.toString())
            .jsonPath("$[0].status").isEqualTo("PENDING")
            .jsonPath("$[0].outgoing").isEqualTo(false)
            .jsonPath("$[0].description").isEqualTo("Кафе в центре")
    }

    @Test
    fun `GET meetings returns outgoing pending meeting for sender`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].userId").isEqualTo(users.userBId.toString())
            .jsonPath("$[0].status").isEqualTo("PENDING")
            .jsonPath("$[0].outgoing").isEqualTo(true)
    }

    @Test
    fun `POST meetings requires authentication`() {
        val meeting = testMeeting(users.userBId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    @Test
    fun `PUT accept returns 404 when meeting does not exist`() {
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/accept")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `PUT accept returns 404 for declined meeting without resend`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/decline")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/accept")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `PUT accept is idempotent when meeting already accepted`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/accept")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
            .jsonPath("$.status").isEqualTo("ACCEPTED")

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/accept")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
            .jsonPath("$.status").isEqualTo("ACCEPTED")
    }

    @Test
    fun `PUT decline returns 404 when meeting does not exist`() {
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/decline")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `PUT decline is idempotent when meeting already declined`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/decline")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
            .jsonPath("$.status").isEqualTo("DECLINED")

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/decline")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.success").isEqualTo(true)
            .jsonPath("$.status").isEqualTo("DECLINED")
    }

    @Test
    fun `PUT accept returns 404 when sender tries to accept own outgoing meeting`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userBId}/accept")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isNotFound
    }

    @Test
    fun `GET sent returns false before meeting and true after send`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings/${users.userBId}/sent")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.sent").isEqualTo(false)

        sendMeeting(users.userAToken, users.userBId)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings/${users.userBId}/sent")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.sent").isEqualTo(true)
    }

    @Test
    fun `GET sent returns false after sender revokes meeting`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/meetings/${users.userBId}")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings/${users.userBId}/sent")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.sent").isEqualTo(false)
    }

    @Test
    fun `GET badge counts new incoming meetings since timestamp`() {
        val sinceBefore = System.currentTimeMillis() - 1_000

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings/badge?since=$sinceBefore")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.count").isEqualTo(0)

        sendMeeting(users.userAToken, users.userBId)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings/badge?since=$sinceBefore")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.count").isEqualTo(1)

        val sinceAfter = System.currentTimeMillis() + 1_000
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings/badge?since=$sinceAfter")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.count").isEqualTo(0)
    }

    @Test
    fun `DELETE meeting by sender returns updated list without meeting`() {
        sendMeeting(users.userAToken, users.userBId)

        val meetings: List<UserMeeting> = webTestClient.delete()
            .uri("$API_WITH_VERSION_1/meetings/${users.userBId}")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult()
            .responseBody ?: emptyList()

        assertEquals(0, meetings.size)

        val recipientMeetings: List<UserMeeting> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult()
            .responseBody ?: emptyList()
        assertEquals(0, recipientMeetings.size)
    }

    @Test
    fun `DELETE meeting for unknown user returns empty list`() {
        val meetings: List<UserMeeting> = webTestClient.delete()
            .uri("$API_WITH_VERSION_1/meetings/00000000-0000-0000-0000-000000000099")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult()
            .responseBody ?: emptyList()

        assertTrue(meetings.isEmpty())
    }

    @Test
    fun `GET meetings shows accepted incoming meeting for recipient`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/accept")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].userId").isEqualTo(users.userAId.toString())
            .jsonPath("$[0].status").isEqualTo("ACCEPTED")
            .jsonPath("$[0].outgoing").isEqualTo(false)
    }

    @Test
    fun `accept meeting sends system message only to initiator`() {
        sendMeeting(users.userAToken, users.userBId)

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/${users.userAId}/accept")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/${users.userBId}")
            .header(HttpHeaders.AUTHORIZATION, users.userAToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(1)
            .jsonPath("$.messages[0].message").isEqualTo(MeetingSystemMailMessages.ACCEPTED)
            .jsonPath("$.messages[0].isSystem").isEqualTo(true)
            .jsonPath("$.messages[0].mediaType").isEqualTo("SYSTEM")

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/${users.userAId}")
            .header(HttpHeaders.AUTHORIZATION, users.userBToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(0)
    }
}
