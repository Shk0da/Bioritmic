package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class DiamondControllerTest : ApiApplicationTests() {

    @Test
    fun `transfer diamonds between users atomically`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val adminToken = registerAndLogin("diamond_admin_$suffix@test.com", "Admin")
        val senderToken = registerAndLogin("diamond_sender_$suffix@test.com", "Sender")
        val recipientToken = registerAndLogin("diamond_recipient_$suffix@test.com", "Recipient")

        val senderId = getUserId(senderToken)
        val recipientId = getUserId(recipientToken)

        recordPurchase(senderId, 100)
        setDiamondBalanceAsAdmin(adminToken, recipientId, 10)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/diamonds/transfer")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $senderToken")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("toUserId" to recipientId, "amount" to 25, "requireBookmark" to false)))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.balance").isEqualTo(75)

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/diamonds/balance")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $recipientToken")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.balance").isEqualTo(35)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/diamonds/transfer")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $senderToken")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf("toUserId" to recipientId, "amount" to 100, "requireBookmark" to false)
                )
            )
            .exchange()
            .expectStatus().isBadRequest
    }

    @Test
    fun `diamond transfer creates visible conversation message`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val adminToken = registerAndLogin("diamond_msg_admin_$suffix@test.com", "Admin")
        val senderToken = registerAndLogin("diamond_msg_sender_$suffix@test.com", "Natasha")
        val recipientToken = registerAndLogin("diamond_msg_recipient_$suffix@test.com", "Alex")

        val senderId = getUserId(senderToken)
        val recipientId = getUserId(recipientToken)
        recordPurchase(senderId, 50)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/diamonds/transfer")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $senderToken")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("toUserId" to recipientId, "amount" to 7, "requireBookmark" to false)))
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$recipientId")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $senderToken")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages[0].mediaType").isEqualTo("DIAMOND")
            .jsonPath("$.messages[0].message").value<String> { it.contains("7") && it.contains("Natasha") }

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$senderId")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $recipientToken")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.messages[0].mediaType").isEqualTo("DIAMOND")
    }

    @Test
    fun `admin can transfer without prior top-up purchase`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val adminToken = registerAndLogin("diamond_admin_xfer_$suffix@test.com", "Admin")
        val recipientToken = registerAndLogin("diamond_admin_recipient_$suffix@test.com", "Recipient")
        val recipientId = getUserId(recipientToken)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/diamonds/transfer")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $adminToken")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf("toUserId" to recipientId, "amount" to 10, "requireBookmark" to false)
                )
            )
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.balance").isEqualTo(90)
    }

    @Test
    fun `transfer rejected without prior top-up purchase`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        val adminToken = registerAndLogin("diamond_farm_admin_$suffix@test.com", "Admin")
        val senderToken = registerAndLogin("diamond_farm_sender_$suffix@test.com", "Sender")
        val recipientToken = registerAndLogin("diamond_farm_recipient_$suffix@test.com", "Recipient")

        val senderId = getUserId(senderToken)
        val recipientId = getUserId(recipientToken)
        setDiamondBalanceAsAdmin(adminToken, senderId, 100)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/diamonds/transfer")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $senderToken")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf("toUserId" to recipientId, "amount" to 10, "requireBookmark" to false)
                )
            )
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.errors[0].errorCode").isEqualTo("API-400.11")
            .jsonPath("$.errors[0].message").isEqualTo("Diamond transfers are available after your first balance top-up")
    }

    @Test
    fun `transfer rejected when insufficient balance after purchase`() {
        val suffix = UUID.randomUUID().toString().substring(0, 8)
        registerAndLogin("diamond_low_admin_$suffix@test.com", "Admin")
        val senderToken = registerAndLogin("diamond_low_sender_$suffix@test.com", "Sender")
        val recipientToken = registerAndLogin("diamond_low_recipient_$suffix@test.com", "Recipient")

        val senderId = getUserId(senderToken)
        val recipientId = getUserId(recipientToken)
        recordPurchase(senderId, 5)

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/diamonds/transfer")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $senderToken")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("toUserId" to recipientId, "amount" to 12, "requireBookmark" to false)))
            .exchange()
            .expectStatus().isBadRequest
            .expectBody()
            .jsonPath("$.errors[0].errorCode").isEqualTo("API-400.10")
            .jsonPath("$.errors[0].message").isEqualTo("Insufficient diamond balance")
    }

    private fun recordPurchase(userId: String, amount: Long) {
        runBlocking {
            diamondService.recordPurchase(UUID.fromString(userId), amount)
        }
    }

    private fun registerAndLogin(email: String, name: String): String {
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
                    "acceptedUserAgreement" to true,
                    "acceptedPersonalDataProcessing" to true
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated

        var token = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email, "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken")
            .value { value: Any -> token = value as String }
        verifyUserForTests(UUID.fromString(getUserId(token)), grantRegistrationBonus = false)
        return token
    }

    private fun setDiamondBalanceAsAdmin(adminToken: String, userId: String, balance: Long) {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/admin/users/$userId/diamonds")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $adminToken")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("balance" to balance)))
            .exchange()
            .expectStatus().isOk
    }

    private fun getUserId(token: String): String {
        var userId = ""
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $token")
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id")
            .value { value: Any -> userId = value as String }
        return userId
    }
}
