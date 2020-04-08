package com.github.shk0da.bioritmic.api.controller.v1

import io.ktor.locations.KtorExperimentalLocationsAPI
import io.ktor.locations.Location

@KtorExperimentalLocationsAPI
class ExampleController {

    @Location("/location/{name}")
    class MyLocation(val name: String, val arg1: Int = 42, val arg2: String = "default")

    @Location("/type/{name}")
    data class Type(val name: String) {
        @Location("/edit")
        data class Edit(val type: Type)

        @Location("/list/{page}")
        data class List(val type: Type, val page: Int)
    }
}

