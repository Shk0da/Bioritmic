package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty
import java.util.UUID

data class ReportRequest(
    @JsonProperty("reported_user_id")
    val reportedUserId: UUID,
    val reason: String,
    val description: String? = null
)
