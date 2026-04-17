package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
import org.springframework.data.annotation.Id
import org.springframework.data.annotation.Transient
import org.springframework.data.domain.Persistable
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table

@Table(name = "user_settings")
class UserSettings : Persistable<Long> {

    @Id
    @Column("user_id")
    var userId: Long? = null

    @Column("gender")
    var gender: Short? = null

    @Column("age_min")
    var ageMin: Int? = null

    @Column("age_max")
    var ageMax: Int? = null

    @Column("distance")
    var distance: Double? = null

    @Transient
    private var isNew: Boolean = false

    @Transient
    override fun getId(): Long? {
        return userId
    }

    @Transient
    override fun isNew(): Boolean {
        return isNew
    }

    fun markAsNew() {
        isNew = true
    }

    fun getGender(): Gender? {
        if (null == this.gender || Gender.values().size < this.gender!!.toInt()) {
            return null
        }
        return Gender.values()[this.gender!!.toInt()]
    }

    fun setGender(gender: Gender) {
        this.gender = gender.ordinal.toShort()
    }
}
