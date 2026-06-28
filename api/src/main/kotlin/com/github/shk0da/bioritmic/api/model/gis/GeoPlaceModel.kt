package com.github.shk0da.bioritmic.api.model.gis

data class GeoPlaceModel(
    val name: String,
    val displayName: String,
    val lat: Double,
    val lon: Double,
    val countryCode: String,
    val type: String
)
