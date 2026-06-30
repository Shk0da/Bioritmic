package com.github.shk0da.bioritmic.api.model.mailbox

import com.github.shk0da.bioritmic.api.domain.UserMail
import java.sql.Timestamp
import java.util.UUID

object MailSystemMessage {
    fun isSystem(mail: UserMail): Boolean {
        if (mail.mediaType == MailMediaType.SYSTEM.name) {
            return true
        }
        val text = mail.message?.trim().orEmpty()
        return text.isNotEmpty() && text in MeetingSystemMailMessages.ALL
    }

    fun create(fromUserId: UUID, toUserId: UUID, message: String): UserMail {
        return UserMail().apply {
            this.fromUserId = fromUserId
            this.toUserId = toUserId
            this.message = message
            this.mediaType = MailMediaType.SYSTEM.name
            this.timestamp = Timestamp(System.currentTimeMillis())
        }
    }
}
