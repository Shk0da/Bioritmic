package com.github.shk0da.bioritmic.api.model

import javax.validation.constraints.NotEmpty

data class VerifyEmailRequest(
    @field:NotEmpty val code: String
)
