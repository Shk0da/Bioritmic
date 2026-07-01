package com.github.shk0da.bioritmic.model.error

import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.error.ApiError
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ApiErrorTest {

    @Test
    fun `should use custom error message when error parameter is provided`() {
        val apiError = ApiError.of(
            ErrorCode.INVALID_PARAMETER,
            mapOf("error" to "Top up your balance before transferring diamonds"),
        )

        assertEquals("Top up your balance before transferring diamonds", apiError.message)
        assertEquals(ErrorCode.INVALID_PARAMETER.code, apiError.errorCode)
    }

    @Test
    fun `should interpolate parameter name in template`() {
        val apiError = ApiError.of(
            ErrorCode.INVALID_PARAMETER,
            mapOf(ErrorCode.Constants.PARAMETER_NAME to "amount"),
        )

        assertEquals("Parameter [amount] value is invalid.", apiError.message)
        assertEquals("amount", apiError.parameterName)
    }
}
