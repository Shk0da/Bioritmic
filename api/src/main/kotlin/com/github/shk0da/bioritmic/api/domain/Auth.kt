package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.configuration.ApiConfiguration.Companion.defaultZone
import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.time.LocalDateTime
import java.util.*

@Table(
    name = "authorizations"
)
class Auth : Serializable {

    @Id
    @Column("id")
    var id: Long? = null

    @Column("user_id")
    var userId: Long? = null

    @Column("access_token")
    var accessToken: String? = null

    @Column("refresh_token")
    var refreshToken: String? = null

    @Column("expire_time")
    var expireTime: Timestamp? = null

    companion object {

        private const val serialVersionUID = 1L
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
