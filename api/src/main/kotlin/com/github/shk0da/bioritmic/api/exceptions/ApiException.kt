package com.github.shk0da.bioritmic.api.exceptions

import com.google.common.collect.Maps
import org.springframework.http.HttpStatus

class ApiException : RuntimeException {

    var errorCode: ErrorCode? = null
    var parameter: String? = null
    var error: String? = null
    var httpStatus: HttpStatus? = null
    var parameters: Map<String, String> = Maps.newHashMap()

    constructor(message: String) : super(message)

    constructor(errorCode: ErrorCode) : super(errorCode.toString()) {
        this.errorCode = errorCode
        httpStatus = errorCode.httpCode
    }

    constructor(errorCode: ErrorCode, parameters: Map<String, String>) : super(errorCode.toString()) {
        this.errorCode = errorCode
        this.parameters = parameters
        httpStatus = errorCode.httpCode
    }

    constructor(parameter: String, error: String) : super("$parameter: $error") {
        this.parameter = parameter
        this.error = error
    }

    companion object {
        const val serialVersionUID = -7034897190745766940L
    }
}