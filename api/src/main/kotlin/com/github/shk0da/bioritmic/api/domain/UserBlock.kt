package com.github.shk0da.bioritmic.api.domain

import java.io.Serializable
import java.sql.Timestamp
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table

@Entity
@IdClass(UserBlock.PrimaryKey::class)
@Table(name = "user_blocks")
class UserBlock {

    data class PrimaryKey(var userId: Long? = null, var otherUserId: Long? = null) : Serializable

    @Id
    @Column(name = "user_id")
    var userId: Long? = null

    @Id
    @Column(name = "other_user_id")
    var otherUserId: Long? = null

    @Column(name = "timestamp")
    var timestamp: Timestamp? = null
}
