package com.github.shk0da.bioritmic.api.model.mailbox

import javax.validation.constraints.NotBlank

data class MailReactionRequest(
    @field:NotBlank
    val reaction: String
)
