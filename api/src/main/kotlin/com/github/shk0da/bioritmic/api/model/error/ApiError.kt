package com.github.shk0da.bioritmic.api.model.error

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
class ApiError(val errorCode: String, val message: String, val parameterName: String?) {

    companion object {
        fun of(errorCode: ErrorCode): ApiError {
            return ApiError(errorCode.code, errorCode.message, null)
        }

        fun of(errorCode: ErrorCode, parameters: Map<String, String?>): ApiError {
            var parameterName: String? = null
            var message: String = errorCode.message
            for ((key, value) in parameters) {
                if (PARAMETER_NAME == key) {
                    parameterName = value
                }
                message = message.replace("\${$key}", value!!)
            }
            return ApiError(errorCode.code, message, parameterName)
        }
    }
}
