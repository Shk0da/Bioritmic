package com.github.shk0da.bioritmic.domain

import com.github.shk0da.bioritmic.api.model.BasicPresentation

data class UserModel(
    val id: Long? = null,
    val name: String,
    val email: String,
    val birthday: String,
    val gender: String? = null,
    val password: String? = null
) : BasicPresentation