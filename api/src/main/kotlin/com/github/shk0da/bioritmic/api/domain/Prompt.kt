package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable

@Table(name = "prompts")
class Prompt : Serializable {

    @Id
    var id: Long? = null

    @Column("text")
    var text: String = ""

    @Column("category")
    var category: String = ""

    @Column("active")
    var active: Boolean = true

    companion object {
        private const val serialVersionUID = 1L
    }
}
