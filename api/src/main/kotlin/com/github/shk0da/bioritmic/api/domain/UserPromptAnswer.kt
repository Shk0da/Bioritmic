package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table(name = "user_prompt_answers")
class UserPromptAnswer : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: UUID = UUID.randomUUID()

    @Column("prompt_id")
    var promptId: Long = 0

    @Column("answer")
    var answer: String = ""

    @Column("created_at")
    var createdAt: Timestamp? = null

    companion object {
        private const val serialVersionUID = 1L
    }
}
