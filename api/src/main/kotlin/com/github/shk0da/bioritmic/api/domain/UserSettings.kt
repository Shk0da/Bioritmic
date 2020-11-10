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
    @Enumerated(EnumType.STRING)
    @org.springframework.data.relational.core.mapping.Column
    var gender: Gender? = null

    @Column(name = "age_min")
    @org.springframework.data.relational.core.mapping.Column
    var ageMin: Int? = null

    @Column(name = "age_max")
    @org.springframework.data.relational.core.mapping.Column
    var ageMax: Int? = null

    @Column(name = "distance")
    @org.springframework.data.relational.core.mapping.Column
    var distance: Double? = null

    @JoinColumn(name = "user_id", referencedColumnName = "id")
    @OneToOne(fetch = FetchType.LAZY)
    var user: User? = null
}
