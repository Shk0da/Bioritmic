package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
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
    var gender: Short? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var lat: Double? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var lon: Double? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
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
