package com.github.shk0da.bioritmic.api.utils

object StringUtils {

    fun isEmpty(str: String?): Boolean {
        return str == null || str.length == 0
    }

    fun isNotEmpty(str: String?): Boolean {
        return !isEmpty(str)
    }

    fun isBlank(str: String?): Boolean {
        var strLen = 0
        return if (str != null && str.length.also { strLen = it } != 0) {
            for (i in 0 until strLen) {
                if (!Character.isWhitespace(str[i])) {
                    return false
                }
            }
            true
        } else {
            true
        }
    }

    fun isNotBlank(str: String?): Boolean {
        return !isBlank(str)
    }
}