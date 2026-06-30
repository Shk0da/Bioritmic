package com.github.shk0da.bioritmic.controller.mailbox

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.mailbox.MeetingSystemMailMessages
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.domain.UserModel
import com.github.shk0da.bioritmic.testutil.testMeeting
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
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
            .jsonPath("$.messages[0].mediaType").isEqualTo("PHOTO")
            .jsonPath("$.messages[0].mediaUrl").isNotEmpty
            .jsonPath("$.messages[0].message").isEqualTo("Photo caption")
    }

    @Test
    fun sendMediaMailPhotoWithReplyTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_media_reply_a_$suffix@gmail.com"
        val userBEmail = "mailbox_media_reply_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "Media Reply A")
        val userBId = registerAndGetUserId(userBEmail, "Media Reply B")
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
            .jsonPath("$.messages[0].id").value { id: Any -> originalMessageId = (id as Number).toLong() }

        val imageBytes = javaClass.classLoader.getResourceAsStream("images/no_image.png")!!.readBytes()
        val builder = org.springframework.http.client.MultipartBodyBuilder()
        builder.part("to", userAId.toString())
        builder.part("mediaType", "PHOTO")
        builder.part("file", org.springframework.core.io.ByteArrayResource(imageBytes))
            .filename("photo.png")
            .contentType(MediaType.IMAGE_PNG)
        builder.part("message", "Photo reply")
        builder.part("replyToMessageId", originalMessageId.toString())

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox/media")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(BodyInserters.fromMultipartData(builder.build()))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages[1].mediaType").isEqualTo("PHOTO")
            .jsonPath("$.messages[1].replyToMessageId").isEqualTo(originalMessageId)
            .jsonPath("$.messages[1].message").isEqualTo("Photo reply")
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
            .jsonPath("$.messages.length()").isEqualTo(3)
            .jsonPath("$.messages[0].message").isEqualTo("Hello from A")
            .jsonPath("$.messages[1].message").isEqualTo("Reply from B")
            .jsonPath("$.messages[2].message").isEqualTo("Second from A")
            .jsonPath("$.hasMore").isEqualTo(false)
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
            .jsonPath("$.messages[0].id").value { id: Any -> originalMessageId = (id as Number).toLong() }

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
            .jsonPath("$.messages[1].replyToMessageId").isEqualTo(originalMessageId)
            .jsonPath("$.messages[1].message").isEqualTo("Reply to original")
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
            .jsonPath("$.messages[0].id").value { id: Any -> messageId = (id as Number).toLong() }

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
            .jsonPath("$.messages[0].currentUserReaction").doesNotExist()
            .jsonPath("$.messages[0].reactionCounts.HEART").doesNotExist()
    }

    @Test
    fun markMessagesAsReadWhenRecipientOpensConversationTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_read_a_$suffix@gmail.com"
        val userBEmail = "mailbox_read_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "Read A")
        val userBId = registerAndGetUserId(userBEmail, "Read B")
        val tokenA = loginAndGetToken(userAEmail, userAId)
        val tokenB = loginAndGetToken(userBEmail, userBId)

        sendMail(tokenA, userBId, "Please read me")

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages[0].isRead").isEqualTo(false)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userAId")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages[0].isRead").isEqualTo(true)
    }

    @Test
    fun conversationPaginationTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_page_a_$suffix@gmail.com"
        val userBEmail = "mailbox_page_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "Page A")
        val userBId = registerAndGetUserId(userBEmail, "Page B")
        val tokenA = loginAndGetToken(userAEmail, userAId)

        repeat(35) { index ->
            sendMail(tokenA, userBId, "Message ${index + 1}")
        }

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId?size=30")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(30)
            .jsonPath("$.messages[0].message").isEqualTo("Message 6")
            .jsonPath("$.messages[29].message").isEqualTo("Message 35")
            .jsonPath("$.hasMore").isEqualTo(true)

        var beforeId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId?size=30")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages[0].id").value { id: Any -> beforeId = (id as Number).toLong() }

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId?before=$beforeId&size=30")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(5)
            .jsonPath("$.messages[0].message").isEqualTo("Message 1")
            .jsonPath("$.messages[4].message").isEqualTo("Message 5")
            .jsonPath("$.hasMore").isEqualTo(false)
    }

    @Test
    fun deleteOwnMessagesTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_del_a_$suffix@gmail.com"
        val userBEmail = "mailbox_del_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "Delete A")
        val userBId = registerAndGetUserId(userBEmail, "Delete B")
        val tokenA = loginAndGetToken(userAEmail, userAId)
        val tokenB = loginAndGetToken(userBEmail, userBId)

        sendMail(tokenA, userBId, "Keep me")
        sendMail(tokenA, userBId, "Delete me")

        var ownMessageId = 0L
        var keepMessageId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(2)
            .jsonPath("$.messages[0].id").value { id: Any -> keepMessageId = (id as Number).toLong() }
            .jsonPath("$.messages[1].message").isEqualTo("Delete me")
            .jsonPath("$.messages[1].id").value { id: Any -> ownMessageId = (id as Number).toLong() }

        webTestClient.method(HttpMethod.DELETE)
            .uri("$API_WITH_VERSION_1/mailbox/messages")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("ids" to listOf(ownMessageId))))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.deleted").isEqualTo(1)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(1)
            .jsonPath("$.messages[0].message").isEqualTo("Keep me")

        webTestClient.method(HttpMethod.DELETE)
            .uri("$API_WITH_VERSION_1/mailbox/messages")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("ids" to listOf(keepMessageId))))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden
    }

    @Test
    fun deleteOwnMessageKeepsReplyMessageTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_del_reply_a_$suffix@gmail.com"
        val userBEmail = "mailbox_del_reply_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "Delete Reply A")
        val userBId = registerAndGetUserId(userBEmail, "Delete Reply B")
        val tokenA = loginAndGetToken(userAEmail, userAId)
        val tokenB = loginAndGetToken(userBEmail, userBId)

        sendMail(tokenA, userBId, "Original to delete")

        var originalMessageId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(1)
            .jsonPath("$.messages[0].id").value { id: Any -> originalMessageId = (id as Number).toLong() }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    UserMailModel(
                        to = userAId,
                        message = "Reply should stay",
                        replyToMessageId = originalMessageId
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(2)
            .jsonPath("$.messages[1].replyToMessageId").isEqualTo(originalMessageId)

        webTestClient.method(HttpMethod.DELETE)
            .uri("$API_WITH_VERSION_1/mailbox/messages")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("ids" to listOf(originalMessageId))))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.deleted").isEqualTo(1)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userAId")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(1)
            .jsonPath("$.messages[0].message").isEqualTo("Reply should stay")
            .jsonPath("$.messages[0].replyToMessageId").doesNotExist()
            .jsonPath("$.messages[0].replyTargetUnavailable").isEqualTo(true)
    }

    @Test
    fun unreadBadgeTest() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/badge?since=0")
            .header(HttpHeaders.AUTHORIZATION, authToken)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.count").isNumber
    }

    @Test
    fun meetingSystemMessageCannotBeDeletedOrRepliedTest() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val userAEmail = "mailbox_system_a_$suffix@gmail.com"
        val userBEmail = "mailbox_system_b_$suffix@gmail.com"

        val userAId = registerAndGetUserId(userAEmail, "System A")
        val userBId = registerAndGetUserId(userBEmail, "System B")
        val tokenA = loginAndGetToken(userAEmail, userAId)
        val tokenB = loginAndGetToken(userBEmail, userBId)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(testMeeting(userBId))))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$userAId/accept")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        var systemMessageId = 0L
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$userBId")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages.length()").isEqualTo(1)
            .jsonPath("$.messages[0].message").isEqualTo(MeetingSystemMailMessages.ACCEPTED)
            .jsonPath("$.messages[0].isSystem").isEqualTo(true)
            .jsonPath("$.messages[0].mediaType").isEqualTo("SYSTEM")
            .jsonPath("$.messages[0].id").value { id: Any -> systemMessageId = (id as Number).toLong() }

        webTestClient.method(HttpMethod.DELETE)
            .uri("$API_WITH_VERSION_1/mailbox/messages")
            .header(HttpHeaders.AUTHORIZATION, tokenB)
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("ids" to listOf(systemMessageId))))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isForbidden

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .header(HttpHeaders.AUTHORIZATION, tokenA)
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    UserMailModel(
                        to = userBId,
                        message = "Reply to system",
                        replyToMessageId = systemMessageId
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isBadRequest
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
