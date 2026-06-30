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

    @Column("media_type")
    var mediaType: String? = null

    @Column("media_s3_key")
    var mediaS3Key: String? = null

    @Column("reply_to_message_id")
    var replyToMessageId: Long? = null

    @Column("reply_target_unavailable")
    var replyTargetUnavailable: Boolean = false

    @Column("is_read")
    var isRead: Boolean = false

    companion object {
        fun of(userMailModel: UserMailModel): UserMail {
            val userMail = UserMail()
            userMail.id = userMailModel.id
            userMail.fromUserId = userMailModel.from
            userMail.toUserId = userMailModel.to
            userMail.message = userMailModel.message?.trim()?.takeIf { it.isNotEmpty() } ?: ""
            userMail.mediaType = userMailModel.mediaType
            userMail.mediaS3Key = userMailModel.mediaS3Key
            userMail.replyToMessageId = userMailModel.replyToMessageId
            userMail.timestamp = Timestamp(System.currentTimeMillis())
            return userMail
        }

        fun createMedia(
            fromUserId: UUID,
            toUserId: UUID,
            mediaType: String,
            mediaS3Key: String,
            caption: String?,
            replyToMessageId: Long? = null
        ): UserMail {
            return UserMail().apply {
                this.fromUserId = fromUserId
                this.toUserId = toUserId
                this.mediaType = mediaType
                this.mediaS3Key = mediaS3Key
                this.message = caption?.trim()?.takeIf { it.isNotEmpty() } ?: ""
                this.replyToMessageId = replyToMessageId
                this.timestamp = Timestamp(System.currentTimeMillis())
            }
        }
    }

    override fun toString(): String {
        return "UserMail(id=$id, fromUserId=$fromUserId, toUserId=$toUserId, message=$message, " +
            "mediaType=$mediaType, replyToMessageId=$replyToMessageId, timestamp=$timestamp)"
    }
}
