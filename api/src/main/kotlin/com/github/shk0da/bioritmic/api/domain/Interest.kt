package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable

@Table(name = "interests")
class Interest : Serializable {

    @Id
    var id: Long? = null

    @Column("name")
    var name: String = ""

    @Column("category")
    var category: String = ""

    @Column("icon")
    var icon: String? = null

    @Column("active")
    var active: Boolean = true
}
