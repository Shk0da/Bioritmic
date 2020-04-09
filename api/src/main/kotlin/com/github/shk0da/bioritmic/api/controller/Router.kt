package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.controller.v1.rest.ExampleController
import com.github.shk0da.bioritmic.api.model.JsonSampleClass
import io.ktor.application.Application
import io.ktor.application.call
import io.ktor.http.ContentType
import io.ktor.http.content.resources
import io.ktor.http.content.static
import io.ktor.locations.KtorExperimentalLocationsAPI
import io.ktor.locations.get
import io.ktor.response.respond
import io.ktor.response.respondText
import io.ktor.routing.Routing
import io.ktor.routing.get
import io.ktor.routing.route
import io.ktor.routing.routing

@KtorExperimentalLocationsAPI
object Router {

    fun Application.routing() {
        routing {
            static("/static") {
                resources("static")
            }

            get("/") {
                call.respondText("HELLO WORLD!", contentType = ContentType.Text.Plain)
            }

            get("/json") {
                call.respond(JsonSampleClass("HELLO WORLD!"))
            }

            example()
        }
    }

    private fun Routing.example() {
        route("") {
            get<ExampleController.MyLocation> {
                call.respondText("Location: name=${it.name}, arg1=${it.arg1}, arg2=${it.arg2}")
            }
            // Register nested routes
            get<ExampleController.Type.Edit> {
                call.respondText("Inside $it")
            }
            get<ExampleController.Type.List> {
                call.respondText("Inside $it")
            }
        }
    }
}