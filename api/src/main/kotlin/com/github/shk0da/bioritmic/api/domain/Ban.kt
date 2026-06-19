package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp

@Table(name = "bans")
class Ban : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: Long = 0

    @Column("reason")
    var reason: String = ""

    @Column("banned_until")
    var bannedUntil: Timestamp? = null

    @Column("permanent")
    var permanent: Boolean = false

    @Column("created_at")
    var createdAt: Timestamp? = null
}
