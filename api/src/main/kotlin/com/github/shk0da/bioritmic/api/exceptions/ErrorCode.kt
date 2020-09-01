package com.github.shk0da.bioritmic.api.exceptions

import org.springframework.http.HttpStatus
import java.util.*

enum class ErrorCode(val code: String, val message: String, val httpCode: HttpStatus) {

    JSON_CANT_BE_PARSED("API-400.1", "JSON can't be parsed.", HttpStatus.BAD_REQUEST),
    REQUIRED_PARAMETER("API-400.2", "Parameter [\${${Constants.PARAMETER_NAME}}] value is required.", HttpStatus.BAD_REQUEST),
    INVALID_PARAMETER("API-400.3", "Parameter [\${${Constants.PARAMETER_NAME}}] value is invalid.", HttpStatus.BAD_REQUEST),
    SCOPE_GROUP_NOT_FOUND("API-400.4", "Parameter [\${${Constants.PARAMETER_NAME}}] with requested value [\${${Constants.PARAMETER_VALUE}}] is invalid.", HttpStatus.BAD_REQUEST),
    WRONG_PARAMETER_SIZE("API-400.5", "The parameter [\${${Constants.PARAMETER_NAME}}] cannot be longer than [\${${Constants.PARAMETER_VALUE_LENGTH}}] characters.", HttpStatus.BAD_REQUEST),
    INVALID_PARAMETER_RANGE("API-400.6", "Parameter [\${${Constants.PARAMETER_NAME}}] value is invalid. Valid range of values: [\${${Constants.PARAMETER_VALUE_START}}-\${${Constants.PARAMETER_VALUE_END}}].", HttpStatus.BAD_REQUEST),

    USER_EXISTS("API-409", "The user with this email is already registered.", HttpStatus.CONFLICT),

    INVALID_URI("API-404", "Invalid URI.", HttpStatus.NOT_FOUND),

    API_INTERNAL_ERROR("API-500", "Unknown error.", HttpStatus.INTERNAL_SERVER_ERROR),
    API_SERVICE_UNAVAILABLE("API-503", "Service unavailable.", HttpStatus.SERVICE_UNAVAILABLE);

    object Constants {
        // parameters
        const val PARAMETER_NAME = "parameterName"
        const val PARAMETER_VALUE = "parameterValue"
        const val PARAMETER_VALUE_LENGTH = "parameterValueLength"
        const val PARAMETER_VALUE_START = "parameterValueStart"
        const val PARAMETER_VALUE_END = "parameterValueEnd"
    }

    companion object {
        fun byCode(code: String?): Optional<ErrorCode> {
            var result: ErrorCode? = null
            for (errorCode in values()) {
                if (errorCode.code == code) {
                    result = errorCode
                    break
                }
            }
            return Optional.ofNullable(result)
        }
    }

    override fun toString(): String {
        return "ErrorCode{" +
                "code='" + code + '\'' +
                ", message='" + message + '\'' +
                ", httpCode=" + httpCode +
                '}'
    }
}