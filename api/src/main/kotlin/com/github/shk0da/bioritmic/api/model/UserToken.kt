package com.github.shk0da.bioritmic.api.model

import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import java.util.concurrent.TimeUnit.MILLISECONDS

data class UserToken(val name: String,
                     val email: String,
                     val accessToken: String?,
                     val refreshToken: String?,
                     val expireTime: Long) : BasicPresentation {

    companion object {
        fun of(user: User, auth: Auth): UserToken {
            val expireTime = MILLISECONDS.toSeconds(auth.expireTime!!.time - System.currentTimeMillis())
            return UserToken(user.name!!, user.email!!, auth.accessToken, auth.refreshToken, expireTime)
        }
    }
}