package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table(name = "user_blocks")
class UserBlock {

    data class PrimaryKey(var userId: UUID? = null, var otherUserId: UUID? = null) : Serializable {
        companion object {
            private const val serialVersionUID = 1L
        }
    }

    @Column("user_id")
    var userId: UUID? = null

    @Column("other_user_id")
    var otherUserId: UUID? = null

    @Column("timestamp")
    var timestamp: Timestamp? = null
}
