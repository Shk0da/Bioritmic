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

    fun validate(message: String?) {
        if (StringUtils.isBlank(message) || message!!.length < 1 || message.length >= 1024) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_RANGE, ImmutableMap.of(
                    ErrorCode.Constants.PARAMETER_NAME, "message",
                    ErrorCode.Constants.PARAMETER_VALUE_START, "1",
                    ErrorCode.Constants.PARAMETER_VALUE_END, "1024"
            ))
        }
    }

    fun checkUserBookmarks(it: MutableList<Long>): Boolean {
        if (it.size >= 100) throw ApiException(ErrorCode.MANY_BOOKMARKS)
        return true
    }
}