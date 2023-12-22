package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.configuration.ApiConfiguration.Companion.defaultZone
import java.io.Serializable
import java.sql.Timestamp
import java.time.LocalDateTime
import java.util.UUID
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.GenerationType
import javax.persistence.Id
import javax.persistence.Table
import javax.persistence.UniqueConstraint

@Entity
@Table(name = "authorizations", uniqueConstraints = [
    UniqueConstraint(name = "uq_authorizations_user_id", columnNames = ["user_id"])
])
@org.springframework.data.relational.core.mapping.Table("authorizations")
class Auth : Serializable {

    @Id
    @org.springframework.data.annotation.Id
    @org.springframework.data.relational.core.mapping.Column("id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "user_id")
    @org.springframework.data.relational.core.mapping.Column("user_id")
    var userId: Long? = null

    @Column(name = "access_token")
    @org.springframework.data.relational.core.mapping.Column
    var accessToken: String? = null

    @Column(name = "refresh_token")
    @org.springframework.data.relational.core.mapping.Column
    var refreshToken: String? = null

    @Column(name = "expire_time")
    @org.springframework.data.relational.core.mapping.Column("expire_time")
    var expireTime: Timestamp? = null

    companion object {

        const val lifetimeInMinutes = 60L

        fun createFrom(user: User): Auth {
            return with(Auth()) {
                userId = user.id
                accessToken = UUID.randomUUID().toString()
                refreshToken = UUID.randomUUID().toString()
                expireTime = Timestamp(LocalDateTime.now().plusHours(1).toInstant(defaultZone).toEpochMilli())
                this
            }
        }
    }

    fun refresh(): Auth {
        accessToken = UUID.randomUUID().toString()
        expireTime = Timestamp(LocalDateTime.now().plusMinutes(lifetimeInMinutes).toInstant(defaultZone).toEpochMilli())
        return this
    }

    fun isExpired(): Boolean {
        return null != expireTime && expireTime!!.before(Timestamp(System.currentTimeMillis()))
    }

    override fun toString(): String {
        return "Auth(id=$id, userId=$userId, expireTime=$expireTime)"
    }
}
