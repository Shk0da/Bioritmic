package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
import org.springframework.data.annotation.Id
import java.sql.Timestamp
import java.util.UUID

class GisUser {

    @Id
    var id: UUID? = null

    var name: String? = null

    var birthday: Timestamp? = null

    var gender: Short? = null

    var lat: Double? = null

    var lon: Double? = null

    var distance: Double? = null

    var statusEmoji: String? = null

    var statusPosition: String? = null

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
