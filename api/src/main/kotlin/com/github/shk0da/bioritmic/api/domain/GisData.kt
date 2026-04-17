package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import java.sql.Timestamp
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Transient

@Entity
@Table(name = "gis_data")
class GisData {

    @Id
    @Column(name = "user_id")
    @org.springframework.data.annotation.Id
    @GeneratedValue(strategy = GenerationType.TABLE)
    var userId: Long? = null

    @Column
    var lat: Double? = null

    @Column
    var lon: Double? = null

    @Column(name = "timestamp")
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
