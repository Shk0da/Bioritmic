package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp
import java.util.UUID

@Table(name = "stories")
class Story {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: UUID? = null

    @Column("media_url")
    var mediaUrl: String? = null

    @Column("caption")
    var caption: String? = null

    @Column("expires_at")
    var expiresAt: Timestamp? = null

    @Column("locked")
    var locked: Boolean = false

    @Column("created_at")
    var createdAt: Timestamp? = null
}
