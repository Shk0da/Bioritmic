package com.github.shk0da.bioritmic.api.model.mailbox

object MeetingSystemMailMessages {
    const val ACCEPTED = "Ваше предложение встречи принято!"
    const val DECLINED = "К сожалению, ваше предложение встречи отклонено."
    const val ACCEPTED_CANCELLED = "К сожалению, ранее принятая встреча отменена."
    const val REVOKED_PENDING = "Отправитель отозвал предложение встречи."
    const val REVOKED_ACCEPTED = "Отправитель отозвал ранее согласованную встречу."

    val ALL: Set<String> = setOf(
        ACCEPTED,
        DECLINED,
        ACCEPTED_CANCELLED,
        REVOKED_PENDING,
        REVOKED_ACCEPTED,
    )
}
