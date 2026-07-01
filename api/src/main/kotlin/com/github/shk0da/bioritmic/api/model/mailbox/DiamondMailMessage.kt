package com.github.shk0da.bioritmic.api.model.mailbox

import com.github.shk0da.bioritmic.api.domain.UserMail
import java.sql.Timestamp
import java.util.UUID

object DiamondMailMessage {
    fun isDiamond(mail: UserMail): Boolean = mail.mediaType == MailMediaType.DIAMOND.name

    fun create(fromUserId: UUID, toUserId: UUID, message: String): UserMail {
        return UserMail().apply {
            this.fromUserId = fromUserId
            this.toUserId = toUserId
            this.message = message
            this.mediaType = MailMediaType.DIAMOND.name
            this.timestamp = Timestamp(System.currentTimeMillis())
        }
    }

    fun formatTransferMessage(senderName: String, amount: Long): String {
        return "💎 $senderName отправил(а) $amount ${diamondWord(amount)}"
    }

    private fun diamondWord(amount: Long): String {
        val mod100 = (amount % 100).toInt()
        val mod10 = (amount % 10).toInt()
        return when {
            mod100 in 11..14 -> "алмазов"
            mod10 == 1 -> "алмаз"
            mod10 in 2..4 -> "алмаза"
            else -> "алмазов"
        }
    }
}
