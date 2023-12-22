package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
import org.springframework.data.annotation.Transient
import org.springframework.data.domain.Persistable
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.GenerationType
import javax.persistence.Id
import javax.persistence.Table

@Entity
@Table(name = "user_settings")
@org.springframework.data.relational.core.mapping.Table("user_settings")
class UserSettings : Persistable<Long> {

    @Id
    @Column(name = "user_id")
    @org.springframework.data.annotation.Id
    @org.springframework.data.relational.core.mapping.Column("user_id")
    @GeneratedValue(strategy = GenerationType.TABLE)
    var userId: Long? = null

    @Column(name = "gender")
    @org.springframework.data.relational.core.mapping.Column
    var gender: Short? = null

    @Column(name = "age_min")
    @org.springframework.data.relational.core.mapping.Column
    var ageMin: Int? = null

    @Column(name = "age_max")
    @org.springframework.data.relational.core.mapping.Column
    var ageMax: Int? = null

    @Column(name = "distance")
    @org.springframework.data.relational.core.mapping.Column
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
