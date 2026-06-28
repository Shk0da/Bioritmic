package com.github.shk0da.bioritmic.api.model.gis

data class GisEstimateModel(
    val lat: Double,
    val lon: Double,
    val approximate: Boolean = true
)
