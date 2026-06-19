package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp

@Table(name = "stories")
class Story {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: Long? = null

    @Column("media_url")
    var mediaUrl: String? = null

    @Column("caption")
    var caption: String? = null

    @Column("expires_at")
    var expiresAt: Timestamp? = null

    @Column("created_at")
    var createdAt: Timestamp? = null
}
