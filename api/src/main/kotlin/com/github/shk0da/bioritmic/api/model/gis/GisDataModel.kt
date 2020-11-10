package com.github.shk0da.bioritmic.api.model.gis

import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.GisData
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import java.sql.Timestamp

data class GisDataModel(@JsonIgnore val userId: Long? = null,
                        val lat: Double,
                        val lon: Double,
                        @JsonProperty(access = JsonProperty.Access.READ_ONLY) val timestamp: Timestamp? = null) : BasicPresentation {

    companion object {
        fun of(gisData: GisData): GisDataModel {
            return GisDataModel(gisData.userId, gisData.lat!!, gisData.lon!!, Timestamp(System.currentTimeMillis()))
        }
    }

    override fun toString(): String {
        return "GisDataModel(userId=$userId, lat=$lat, lon=$lon, timestamp=$timestamp)"
    }
}