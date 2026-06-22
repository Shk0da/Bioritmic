package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp

@Table(name = "user_blocks")
class UserBlock {

    data class PrimaryKey(var userId: Long? = null, var otherUserId: Long? = null) : Serializable {
        companion object {
            private const val serialVersionUID = 1L
        }
    }

    @Column("user_id")
    var userId: Long? = null

    @Column("other_user_id")
    var otherUserId: Long? = null

    @Column("timestamp")
    var timestamp: Timestamp? = null
}
