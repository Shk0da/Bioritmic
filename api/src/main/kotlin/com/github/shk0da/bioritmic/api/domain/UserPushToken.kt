package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp

@Table(name = "user_push_tokens")
class UserPushToken : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: Long = 0

    @Column("token")
    var token: String = ""

    @Column("platform")
    var platform: String = ""

    @Column("created_at")
    var createdAt: Timestamp? = null
}
