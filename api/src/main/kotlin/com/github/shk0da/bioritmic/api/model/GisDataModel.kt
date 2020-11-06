package com.github.shk0da.bioritmic.api.model

import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.GisData
import java.sql.Timestamp

data class GisDataModel(@JsonIgnore val userId: Long? = null,
                        val lat: Double?,
                        val lan: Double?,
                        @JsonProperty(access = JsonProperty.Access.READ_ONLY) val timestamp: Timestamp? = null) : BasicPresentation {

    companion object {
        fun of(gisData: GisData): GisDataModel {
            return GisDataModel(gisData.userId, gisData.lat, gisData.lan, Timestamp(System.currentTimeMillis()))
        }
    }

    override fun toString(): String {
        return "GisDataModel(userId=$userId, lat=$lat, lan=$lan, timestamp=$timestamp)"
    }
}