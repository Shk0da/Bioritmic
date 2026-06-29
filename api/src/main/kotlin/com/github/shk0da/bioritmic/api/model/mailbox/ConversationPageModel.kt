package com.github.shk0da.bioritmic.api.model.mailbox

import com.github.shk0da.bioritmic.api.model.user.UserMailModel

data class ConversationPageModel(
    val messages: List<UserMailModel>,
    val hasMore: Boolean,
)
