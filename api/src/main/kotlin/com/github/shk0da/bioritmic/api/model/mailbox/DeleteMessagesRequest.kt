package com.github.shk0da.bioritmic.api.model.mailbox

import javax.validation.constraints.NotEmpty
import javax.validation.constraints.Size

data class DeleteMessagesRequest(
    @field:NotEmpty
    @field:Size(max = 100)
    val ids: List<Long>,
)
