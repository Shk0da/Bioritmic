package com.github.shk0da.bioritmic.api.utils

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.google.common.collect.ImmutableMap

object ValidateUtils {

    fun validate(ageMin: Int?, ageMax: Int?, distance: Double?) {
        if (null != ageMin && ageMin < 14) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, ImmutableMap.of(
                    ErrorCode.Constants.PARAMETER_NAME, "ageMin",
                    ErrorCode.Constants.PARAMETER_VALUE, ageMin.toString()
            ))
        }

        if (null != ageMax && ageMax > 100) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, ImmutableMap.of(
                    ErrorCode.Constants.PARAMETER_NAME, "ageMax",
                    ErrorCode.Constants.PARAMETER_VALUE, ageMax.toString()
            ))
        }

        if (null != ageMin && null != ageMax && (ageMin > ageMax)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, ImmutableMap.of(ErrorCode.Constants.PARAMETER_NAME, "ageMin, ageMax"))
        }

        if (null != distance && (distance < 0.05 || distance > 30.0)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, ImmutableMap.of(
                    ErrorCode.Constants.PARAMETER_NAME, "distance",
                    ErrorCode.Constants.PARAMETER_VALUE, distance.toString()
            ))
        }
    }
}