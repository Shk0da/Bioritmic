package com.github.shk0da.bioritmic.api.model.mailbox

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import java.util.UUID

@JsonIgnoreProperties(ignoreUnknown = true)
data class MailboxWsInbound(
    val action: String,
    val otherUserId: UUID? = null,
)

data class MailboxWsOutbound(
    val type: String,
    val otherUserId: UUID? = null,
    val message: UserMailModel? = null,
    val messageIds: List<Long>? = null,
    val messageId: Long? = null,
    val reaction: String? = null,
    val reactionCounts: Map<String, Int>? = null,
    val balance: Long? = null,
)
