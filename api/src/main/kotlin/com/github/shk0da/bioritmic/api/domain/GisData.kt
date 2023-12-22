package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import java.sql.Timestamp
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.GenerationType
import javax.persistence.Id
import javax.persistence.Table
import javax.persistence.Transient

@Entity
@Table(name = "gis_data")
@org.springframework.data.relational.core.mapping.Table("gis_data")
class GisData {

    @Id
    @Column(name = "user_id")
    @org.springframework.data.annotation.Id
    @org.springframework.data.relational.core.mapping.Column("user_id")
    @GeneratedValue(strategy = GenerationType.TABLE)
    var userId: Long? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var lat: Double? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var lon: Double? = null

    @Column(name = "timestamp")
    @org.springframework.data.relational.core.mapping.Column("timestamp")
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
