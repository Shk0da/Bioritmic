package com.github.shk0da.bioritmic.api.utils

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE_END
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE_START

object ValidateUtils {

    fun validate(ageMin: Int?, ageMax: Int?, distance: Double?) {
        if (null != ageMin && ageMin < 14) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, mapOf(
                    Pair(PARAMETER_NAME, "ageMin"),
                    Pair(PARAMETER_VALUE, ageMin.toString())
            ))
        }

        if (null != ageMax && ageMax > 100) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, mapOf(
                    Pair(PARAMETER_NAME, "ageMax"),
                    Pair(PARAMETER_VALUE, ageMax.toString())
            ))
        }

        if (null != ageMin && null != ageMax && (ageMin > ageMax)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "ageMin, ageMax")))
        }

        if (null != distance && (distance < 0.05 || distance > 30.0)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, mapOf(
                    Pair(PARAMETER_NAME, "distance"),
                    Pair(PARAMETER_VALUE, distance.toString())
            ))
        }
    }

    fun validate(message: String?) {
        if (StringUtils.isBlank(message) || message!!.length < 1 || message.length >= 1024) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_RANGE, mapOf(
                    Pair(PARAMETER_NAME, "message"),
                    Pair(PARAMETER_VALUE_START, "1"),
                    Pair(PARAMETER_VALUE_END, "1024")
            ))
        }
    }

    fun checkNotEmpty(item: Any?, errorCode: ErrorCode, parameters: Map<String, String>): Boolean {
        if (null == item) throw ApiException(errorCode, parameters)
        if (item is String && item.isEmpty()) throw ApiException(errorCode, parameters)
        return true
    }

    fun checkFileExtension(fileName: String?, extensions: List<String>, errorCode: ErrorCode, parameters: Map<String, String>): Boolean {
        if (null == fileName || fileName.isEmpty()) throw ApiException(errorCode, parameters)
        val extension = fileName.substring(fileName.lastIndexOf(".") + 1)
        if (!extensions.contains(extension)) throw ApiException(errorCode, parameters)
        return true
    }

    fun checkSize(size: Number, expectedSize: Int, errorCode: ErrorCode): Boolean {
        if (size.toInt() > expectedSize) throw ApiException(errorCode)
        return true
    }
}