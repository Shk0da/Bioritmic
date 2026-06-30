package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonFormat
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.model.search.Gender
import java.util.Date

data class UpdateUserProfileRequest(
    val name: String? = null,
    val nick: String? = null,
    val email: String? = null,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    val birthday: Date? = null,
    val gender: Gender? = null,
    val bio: String? = null,
    val statusEmoji: String? = null,
    val statusPosition: String? = null,
) : BasicPresentation
