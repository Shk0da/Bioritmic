package com.github.shk0da.bioritmic.api.model

import javax.validation.constraints.NotEmpty

data class ResetPasswordRequest(
    @field:NotEmpty val code: String,
    @field:NotEmpty val password: String
)
