package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table(name = "user_photos")
class UserPhoto : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: UUID? = null

    @Column("photo_order")
    var photoOrder: Int = 0

    @Column("photo_bytes")
    var photoBytes: ByteArray? = null

    @Column("s3_key")
    var s3Key: String? = null

    @Column("content_type")
    var contentType: String? = null

    @Column("created_at")
    var createdAt: Timestamp? = null

    companion object {
        private const val serialVersionUID = 1L
    }
}
