package com.github.shk0da.bioritmic.api.model.error

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
class ApiErrors(vararg error: ApiError) {
    val errors: List<ApiError> = listOf(*error)
}