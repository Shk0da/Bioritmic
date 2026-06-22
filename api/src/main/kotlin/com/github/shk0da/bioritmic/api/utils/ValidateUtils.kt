package com.github.shk0da.bioritmic.api.utils

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE_END
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE_START

object ValidateUtils {

    private const val MIN_AGE = 14
    private const val MAX_AGE = 100
    private const val MIN_DISTANCE = 0.05
    private const val MAX_DISTANCE = 100.0
    private const val MAX_MESSAGE_LENGTH = 1024

    fun validate(ageMin: Int?, ageMax: Int?, distance: Double?) {
        val errors = mutableListOf<String>()

        if (ageMin != null && ageMin < MIN_AGE) errors.add("ageMin")
        if (ageMax != null && ageMax > MAX_AGE) errors.add("ageMax")
        if (ageMin != null && ageMax != null && ageMin > ageMax) errors.add("ageMin, ageMax")
        if (distance != null && (distance < MIN_DISTANCE || distance > MAX_DISTANCE)) errors.add("distance")

        if (errors.isNotEmpty()) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, errors.joinToString(", ")))
            )
        }
    }

    fun validate(message: String?) {
        if (StringUtils.isBlank(message) || message!!.length < 1 || message.length >= MAX_MESSAGE_LENGTH) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER_RANGE, mapOf(
                    Pair(PARAMETER_NAME, "message"),
                    Pair(PARAMETER_VALUE_START, "1"),
                    Pair(PARAMETER_VALUE_END, "1024")
                )
            )
        }
    }

    fun checkNotEmpty(item: Any?, errorCode: ErrorCode, parameters: Map<String, String>): Boolean {
        if (null == item) throw ApiException(errorCode, parameters)
        if (item is String && item.isEmpty()) throw ApiException(errorCode, parameters)
        return true
    }

    fun checkFileExtension(
        fileName: String?, extensions: List<String>,
        errorCode: ErrorCode, parameters: Map<String, String>
    ): Boolean {
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
