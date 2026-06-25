package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp
import java.util.UUID

@Table(name = "mailbox")
class UserMail {

    @Id
    var id: Long? = null

    @Column("from_user_id")
    var fromUserId: UUID? = null

    @Column("to_user_id")
    var toUserId: UUID? = null

    @Column("message")
    var message: String? = null

    @Column("timestamp")
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
