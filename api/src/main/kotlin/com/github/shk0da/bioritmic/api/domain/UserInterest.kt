package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.util.UUID

@Table(name = "user_interests")
class UserInterest : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: UUID = UUID.randomUUID()

    @Column("interest_id")
    var interestId: Long = 0

    companion object {
        private const val serialVersionUID = 1L
    }
}
