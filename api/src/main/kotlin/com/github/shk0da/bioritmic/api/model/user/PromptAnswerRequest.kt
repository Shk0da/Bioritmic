package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty

data class PromptAnswerRequest(
    @JsonProperty("prompt_id")
    val promptId: Long,
    val answer: String
)
