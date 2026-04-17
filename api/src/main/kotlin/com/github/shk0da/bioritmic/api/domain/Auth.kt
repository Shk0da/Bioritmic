package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.configuration.ApiConfiguration.Companion.defaultZone
import java.io.Serializable
import java.sql.Timestamp
import java.time.LocalDateTime
import java.util.*
import jakarta.persistence.*

@Entity
@Table(
    name = "authorizations", uniqueConstraints = [
        UniqueConstraint(name = "uq_authorizations_user_id", columnNames = ["user_id"])
    ]
)
class Auth : Serializable {

    @Id
    @org.springframework.data.annotation.Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "user_id")
    var userId: Long? = null

    @Column(name = "access_token")
    var accessToken: String? = null

    @Column(name = "refresh_token")
    var refreshToken: String? = null

    @Column(name = "expire_time")
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
