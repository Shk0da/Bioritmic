package com.github.shk0da.bioritmic.api.domain

import java.sql.Timestamp
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.Id

@Entity
class GisUser {

    @Id
    @org.springframework.data.annotation.Id
    @org.springframework.data.relational.core.mapping.Column("id")
    var id: Long? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var name: String? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var birthday: Timestamp? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var lat: Double? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var lon: Double? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var distance: Double? = null

    override fun toString(): String {
        return "GisUser(id=$id, name=$name, birthday=$birthday, lat=$lat, lon=$lon, distance=$distance)"
    }
}
