package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import java.sql.Timestamp
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "mailbox")
class UserMail {

    @Id
    @org.springframework.data.annotation.Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "from_user_id")
    var fromUserId: Long? = null

    @Column(name = "to_user_id")
    var toUserId: Long? = null

    @Column(name = "message")
    var message: String? = null

    @Column(name = "timestamp")
    var timestamp: Timestamp? = null

    companion object {
        fun of(userMailModel: UserMailModel): UserMail {
            val userMail = UserMail()
            userMail.id = userMailModel.id
            userMail.fromUserId = userMailModel.from
            userMail.toUserId = userMailModel.to
            userMail.message = userMailModel.message
            userMail.timestamp = Timestamp(System.currentTimeMillis())
            return userMail
        }
    }

    override fun toString(): String {
        return "UserMail(id=$id, fromUserId=$fromUserId, toUserId=$toUserId, message=$message, timestamp=$timestamp)"
    }
}
