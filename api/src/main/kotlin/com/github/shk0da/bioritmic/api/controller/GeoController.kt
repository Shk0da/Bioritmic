package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.constants.GeoCountries
import com.github.shk0da.bioritmic.api.model.gis.GeoCountryModel
import com.github.shk0da.bioritmic.api.model.gis.GeoLocationDetailsModel
import com.github.shk0da.bioritmic.api.model.gis.GeoPlaceModel
import com.github.shk0da.bioritmic.api.service.GeoPlaceService
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/geo")
class GeoController(
    private val geoPlaceService: GeoPlaceService
) {

    @GetMapping(value = ["/countries"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun countries(): List<GeoCountryModel> = GeoCountries.ALL

    @GetMapping(value = ["/places"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun places(
        @RequestParam country: String,
        @RequestParam q: String
    ): List<GeoPlaceModel> = geoPlaceService.searchPlaces(country, q)

    @GetMapping(value = ["/reverse"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun reverse(
        @RequestParam lat: Double,
        @RequestParam lon: Double
    ): GeoLocationDetailsModel = geoPlaceService.reverseGeocode(lat, lon)
}
