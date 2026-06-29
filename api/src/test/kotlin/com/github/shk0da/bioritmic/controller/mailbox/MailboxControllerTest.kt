package com.github.shk0da.bioritmic.controller.mailbox

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID


class MailboxControllerTest : ApiApplicationTests() {

    private lateinit var defaultUserModel: UserModel
    private lateinit var authToken: String
    private var userId: UUID? = null

    @BeforeEach
    fun setup() {
        val uniqueId = UUID.randomUUID().toString().substring(0, 8)
        defaultUserModel = UserModel(
            name = "Mailbox Test User",
            email = "mailbox_test_${uniqueId}@gmail.com",
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
    fun getMailboxTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox?page=0&size=10")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun sendMailTest() {
        val currentUserId = userId ?: throw IllegalStateException("User ID is null")
        val userMailModel = UserMailModel(
            to = currentUserId,
            message = "Test Message"
        )

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(userMailModel))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun sendMediaMailPhotoTest() {
        val currentUserId = userId ?: throw IllegalStateException("User ID is null")
        val imageBytes = javaClass.classLoader.getResourceAsStream("images/no_image.png")!!.readBytes()
        val builder = org.springframework.http.client.MultipartBodyBuilder()
        builder.part("to", currentUserId.toString())
        builder.part("mediaType", "PHOTO")
        builder.part("file", org.springframework.core.io.ByteArrayResource(imageBytes))
            .filename("photo.png")
            .contentType(MediaType.IMAGE_PNG)
        builder.part("message", "Photo caption")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox/media")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].mediaType").isEqualTo("PHOTO")
            .jsonPath("$[0].mediaUrl").isNotEmpty
            .jsonPath("$[0].message").isEqualTo("Photo caption")
    }

    @Test
    fun sendMailReturnsBidirectionalConversationTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_a_$suffix@gmail.com"
        val userBEmail = "mailbox_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "User A")
        val userBId = registerAndGetUserId(userBEmail, "User B")
        val tokenA = loginAndGetToken(userAEmail, userAId)
        val tokenB = loginAndGetToken(userBEmail, userBId)

        sendMail(tokenA, userBId, "Hello from A")
        sendMail(tokenB, userAId, "Reply from B")

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserMailModel(to = userBId, message = "Second from A")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(3)
            .jsonPath("$[0].message").isEqualTo("Hello from A")
            .jsonPath("$[1].message").isEqualTo("Reply from B")
            .jsonPath("$[2].message").isEqualTo("Second from A")
    }

    private fun registerAndGetUserId(email: String, name: String): UUID {
        var userId = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "name" to name,
                        "email" to email,
                        "password" to "Test12345",
                        "birthday" to "1990-01-01",
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id")
            .value { id: Any -> userId = id as String }
        return UUID.fromString(userId)
    }

    private fun loginAndGetToken(email: String, userId: UUID): String {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = email, password = "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        val auth = authTokenCache.values.find { it.userId == userId }
            ?: throw IllegalStateException("Auth not found for $email")
        return "Bearer ${auth.accessToken}"
    }

    private fun sendMail(token: String, toUserId: UUID, message: String) {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .header(HttpHeaders.AUTHORIZATION, token)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserMailModel(to = toUserId, message = message)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun sendMailWithReplyTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_reply_a_$suffix@gmail.com"
        val userBEmail = "mailbox_reply_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "Reply A")
        val userBId = registerAndGetUserId(userBEmail, "Reply B")
        val tokenA = loginAndGetToken(userAEmail, userAId)
        val tokenB = loginAndGetToken(userBEmail, userBId)

        sendMail(tokenA, userBId, "Original message")

        var originalMessageId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id").value { id: Any -> originalMessageId = (id as Number).toLong() }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    UserMailModel(
                        to = userAId,
                        message = "Reply to original",
                        replyToMessageId = originalMessageId
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[1].replyToMessageId").isEqualTo(originalMessageId)
            .jsonPath("$[1].message").isEqualTo("Reply to original")
    }

    @Test
    fun reactToMessageTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_react_a_$suffix@gmail.com"
        val userBEmail = "mailbox_react_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "React A")
        val userBId = registerAndGetUserId(userBEmail, "React B")
        val tokenA = loginAndGetToken(userAEmail, userAId)
        val tokenB = loginAndGetToken(userBEmail, userBId)

        sendMail(tokenA, userBId, "React me")

        var messageId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].id").value { id: Any -> messageId = (id as Number).toLong() }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox/$messageId/react")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("reaction" to "HEART")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reaction").isEqualTo("HEART")
            .jsonPath("$.reactionCounts.HEART").isEqualTo(1)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox/$messageId/react")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("reaction" to "HEART")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.reaction").doesNotExist()
            .jsonPath("$.reactionCounts.HEART").doesNotExist()

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].currentUserReaction").doesNotExist()
            .jsonPath("$[0].reactionCounts.HEART").doesNotExist()
    }

    @Test
    fun deleteMailboxTest() {
        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/mailbox/00000000-0000-0000-0000-000000000001")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
    }
}
