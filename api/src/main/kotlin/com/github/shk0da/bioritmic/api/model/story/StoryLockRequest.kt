package com.github.shk0da.bioritmic.api.model.story

import javax.validation.constraints.NotNull

data class StoryLockRequest(
    @field:NotNull val locked: Boolean
)
