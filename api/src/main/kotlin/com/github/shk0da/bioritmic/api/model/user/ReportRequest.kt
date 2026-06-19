package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty

data class ReportRequest(
    @JsonProperty("reported_user_id")
    val reportedUserId: Long,
    val reason: String,
    val description: String? = null
)
