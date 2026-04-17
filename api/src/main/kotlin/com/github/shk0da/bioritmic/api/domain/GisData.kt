package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import org.springframework.data.annotation.Id
import org.springframework.data.annotation.Transient
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp

@Table(name = "gis_data")
class GisData {

    @Id
    @Column("user_id")
    var userId: Long? = null

    @Column("lat")
    var lat: Double? = null

    @Column("lon")
    var lon: Double? = null

    @Column("timestamp")
    var timestamp: Timestamp? = null

    @Transient
    var distance: Double? = null

    companion object {
        fun of(userId: Long, gisDataModel: GisDataModel): GisData {
            val gisData = GisData()
            gisData.userId = userId
            gisData.lat = gisDataModel.lat
            gisData.lon = gisDataModel.lon
            gisData.timestamp = Timestamp(System.currentTimeMillis())
            return gisData
        }
    }

    override fun toString(): String {
        return "GisData(userId=$userId, lat=$lat, lon=$lon, timestamp=$timestamp)"
    }
}
