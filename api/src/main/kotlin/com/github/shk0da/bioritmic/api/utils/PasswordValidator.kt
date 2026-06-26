package com.github.shk0da.bioritmic.api.utils

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME

object PasswordValidator {

    private val PASSWORD_PATTERN = Regex("^(?=.*[A-Za-z])(?=.*\\d).{8,128}$")

    fun validate(password: String?) {
        if (password.isNullOrBlank() || !PASSWORD_PATTERN.matches(password)) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER,
                mapOf(PARAMETER_NAME to "password")
            )
        }
    }
}
