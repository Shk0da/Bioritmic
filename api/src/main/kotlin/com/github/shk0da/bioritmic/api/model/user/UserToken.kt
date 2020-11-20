package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.Auth
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import java.util.concurrent.TimeUnit.MILLISECONDS
import javax.validation.constraints.NotNull

data class UserToken(@JsonProperty(access = JsonProperty.Access.READ_ONLY)
                     val name: String?,
                     @field:NotNull val email: String,
                     @JsonProperty(access = JsonProperty.Access.READ_ONLY)
                     val accessToken: String?,
                     @field:NotNull val refreshToken: String,
                     @JsonProperty(access = JsonProperty.Access.READ_ONLY)
                     val expireTime: Long?) : BasicPresentation {

    companion object {
        fun of(user: User, auth: Auth): UserToken {
            val expireTime = MILLISECONDS.toSeconds(auth.expireTime!!.time - System.currentTimeMillis())
            return UserToken(user.name!!, user.email!!, auth.accessToken!!, auth.refreshToken!!, expireTime)
        }
    }
}