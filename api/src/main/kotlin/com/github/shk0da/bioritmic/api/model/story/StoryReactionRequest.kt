package com.github.shk0da.bioritmic.api.model.story

import javax.validation.constraints.NotBlank

data class StoryReactionRequest(
    @field:NotBlank
    val reaction: String
)
