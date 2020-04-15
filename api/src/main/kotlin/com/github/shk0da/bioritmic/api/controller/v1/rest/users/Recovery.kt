package com.github.shk0da.bioritmic.api.controller.v1.rest.users

import com.github.shk0da.bioritmic.api.controller.Router
import io.ktor.locations.KtorExperimentalLocationsAPI
import io.ktor.locations.Location

@KtorExperimentalLocationsAPI
@Location(Router.API_V1 + "/user/recovery")
class Recovery
