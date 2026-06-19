package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp

@Table(name = "profile_boosts")
class ProfileBoost : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: Long = 0

    @Column("started_at")
    var startedAt: Timestamp? = null

    @Column("expires_at")
    var expiresAt: Timestamp? = null
}
