package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import java.sql.Timestamp
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.GeneratedValue
import javax.persistence.GenerationType
import javax.persistence.Id
import javax.persistence.Table

@Entity
@Table(name = "mailbox")
@org.springframework.data.relational.core.mapping.Table("mailbox")
class UserMail {

    @Id
    @org.springframework.data.annotation.Id
    @org.springframework.data.relational.core.mapping.Column("id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "from_user_id")
    @org.springframework.data.relational.core.mapping.Column("from_user_id")
    var fromUserId: Long? = null

    @Column(name = "to_user_id")
    @org.springframework.data.relational.core.mapping.Column("to_user_id")
    var toUserId: Long? = null

    @Column(name = "message")
    @org.springframework.data.relational.core.mapping.Column("message")
    var message: String? = null

    @Column(name = "timestamp")
    @org.springframework.data.relational.core.mapping.Column("timestamp")
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
