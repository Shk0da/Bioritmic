package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import org.junit.jupiter.api.Test
import org.springframework.http.MediaType

class ClientConfigControllerTest : ApiApplicationTests() {

    @Test
    fun clientConfigIsPublic() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/config/client")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.firebase.enabled").exists()
    }

    @Test
    fun firebaseServiceWorkerConfigIsPublicJavaScript() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/config/firebase-sw.js")
            .exchange()
            .expectStatus().isOk
            .expectHeader().contentTypeCompatibleWith("application/javascript")
            .expectBody(String::class.java)
            .value { body ->
                require(body != null)
                require(body.startsWith("self.FIREBASE_SW_CONFIG = "))
                require(body.endsWith(";"))
            }
    }
}
