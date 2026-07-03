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
        val mod100 = (amount % HUNDRED).toInt()
        val mod10 = (amount % TEN).toInt()
        return when {
            mod100 in ELEVEN..FOURTEEN -> "алмазов"
            mod10 == ONE -> "алмаз"
            mod10 in TWO..FOUR -> "алмаза"
            else -> "алмазов"
        }
    }

    private const val HUNDRED = 100
    private const val TEN = 10
    private const val ELEVEN = 11
    private const val FOURTEEN = 14
    private const val ONE = 1
    private const val TWO = 2
    private const val FOUR = 4
}
