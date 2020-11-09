package com.github.shk0da.bioritmic.api.utils

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken
import java.security.Principal
import java.util.*

object SecurityUtils {

    fun getUserId(principal: Principal): Long {
        return (principal as PreAuthenticatedAuthenticationToken).principal as Long
    }

    fun getUserId(): Long {
        val auth = SecurityContextHolder.getContext().authentication
        if (null == auth || null == auth.principal) {
            throw ApiException(ErrorCode.AUTH_NOT_FOUND)
        }
        return auth.principal as Long
    }

    fun generateRandomPassword(len: Int): String {
        val symbols = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        val rnd = Random()
        val sb = StringBuilder(len)
        for (i in 0 until len) {
            sb.append(symbols[rnd.nextInt(symbols.length)])
        }
        return sb.toString()
    }
}