package com.github.shk0da.bioritmic.testutil

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.domain.UserModel
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

data class MeetingTestUsers(
    val userAId: UUID,
    val userAToken: String,
    val userBId: UUID,
    val userBToken: String,
)

fun ApiApplicationTests.registerMeetingTestUsers(): MeetingTestUsers {
    val uniqueId = UUID.randomUUID().toString().substring(0, 8)

    val userAEmail = "meetings_a_$uniqueId@gmail.com"
    webTestClient.post()
        .uri("$API_WITH_VERSION_1/registration")
        .contentType(MediaType.APPLICATION_JSON)
        .body(
                BodyInserters.fromValue(
                    UserModel(
                        name = "Meetings User A", email = userAEmail,
                        password = "Test12345", birthday = "1990-01-14"
                    )
                )
            )
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
    val userAId = authA.userId!!

    val userBEmail = "meetings_b_$uniqueId@gmail.com"
    webTestClient.post()
        .uri("$API_WITH_VERSION_1/registration")
        .contentType(MediaType.APPLICATION_JSON)
        .body(
            BodyInserters.fromValue(
                UserModel(name = "Meetings User B", email = userBEmail, password = "Test12345", birthday = "1992-05-20")
            )
        )
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
    val userBId = authB.userId!!

    return MeetingTestUsers(
        userAId = userAId,
        userAToken = "Bearer ${authA.accessToken}",
        userBId = userBId,
        userBToken = "Bearer ${authB.accessToken}",
    )
}
