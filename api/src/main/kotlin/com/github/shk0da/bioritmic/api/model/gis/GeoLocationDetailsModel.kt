package com.github.shk0da.bioritmic.api.model.gis

data class GeoLocationDetailsModel(
    val countryCode: String?,
    val countryName: String?,
    val placeName: String?,
    val displayName: String?,
    val lat: Double,
    val lon: Double
)
