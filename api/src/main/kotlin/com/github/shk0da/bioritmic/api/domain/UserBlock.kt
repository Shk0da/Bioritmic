package com.github.shk0da.bioritmic.api.domain

import java.io.Serializable
import java.sql.Timestamp
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.Id
import javax.persistence.IdClass
import javax.persistence.Table

@Entity
@IdClass(UserBlock.PrimaryKey::class)
@Table(name = "user_blocks")
@org.springframework.data.relational.core.mapping.Table("user_blocks")
class UserBlock {

    data class PrimaryKey(var userId: Long? = null, var otherUserId: Long? = null) : Serializable

    @Id
    @Column(name = "user_id")
    @org.springframework.data.relational.core.mapping.Column("user_id")
    var userId: Long? = null

    @Id
    @Column(name = "other_user_id")
    @org.springframework.data.relational.core.mapping.Column("other_user_id")
    var otherUserId: Long? = null

    @Column(name = "timestamp")
    @org.springframework.data.relational.core.mapping.Column("timestamp")
    var timestamp: Timestamp? = null
}
