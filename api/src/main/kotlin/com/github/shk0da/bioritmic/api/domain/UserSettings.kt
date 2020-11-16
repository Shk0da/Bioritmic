package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
import javax.persistence.*

@Entity
@Table(name = "user_settings")
@org.springframework.data.relational.core.mapping.Table("user_settings")
class UserSettings {

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

    fun getGender(): Gender? {
        if (null == this.gender || Gender.values().size < this.gender as Int) {
            return null
        }
        return Gender.values()[this.gender as Int]
    }

    fun setGender(gender: Gender) {
        this.gender = gender.ordinal as Short
    }
}
