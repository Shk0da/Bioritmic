package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.controller.v1.rest.users.RegistrationController
import io.ktor.application.Application
import io.ktor.application.call
import io.ktor.http.content.resources
import io.ktor.http.content.static
import io.ktor.routing.*

object Router {

    const val API_V1: String = "/api/1.0/"

    fun Application.routing() {
        routing {
            static("/static") {
                resources("static")
            }
        }
    }

    fun Route.userRegistration(registrationController: RegistrationController) {
        route(Router.API_V1 + "/user/registration") {
            get {
                registrationController.getAllUsers(call)
            }
            get("/{userId}") {
                registrationController.getUser(call)
            }
            post {
                registrationController.createUser(call)
            }
        }
    }
}