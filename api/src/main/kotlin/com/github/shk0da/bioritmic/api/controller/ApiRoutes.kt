package com.github.shk0da.bioritmic.api.controller

interface ApiRoutes {
    companion object {

        const val ERROR_PATH = "/error"

        const val API_PATH = "/api"

        // Versions
        const val VERSION_1 = "/v1"
        const val VERSION_2 = "/v2"

        const val API_WITH_VERSION_1 = API_PATH + VERSION_1
        const val API_WITH_VERSION_2 = API_PATH + VERSION_2
    }
}