package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
import java.sql.Timestamp
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id

@Entity
class GisUser {

    @Id
    @org.springframework.data.annotation.Id
    var id: Long? = null

    @Column
    var name: String? = null

    @Column
    var birthday: Timestamp? = null

    @Column
    var gender: Short? = null

    @Column
    var lat: Double? = null

    @Column
    var lon: Double? = null

    @Column
    var distance: Double? = null

    fun getGender(): Gender? {
        if (null == this.gender || Gender.values().size < this.gender!!.toInt()) {
            return null
        }
        return Gender.values()[this.gender!!.toInt()]
    }

    fun setGender(gender: Gender?) {
        if (null == gender) return
        this.gender = gender.ordinal.toShort()
    }

    override fun toString(): String {
        return "GisUser(id=$id, name=$name, birthday=$birthday, gender=$gender lat=$lat, lon=$lon, distance=$distance)"
    }
}
