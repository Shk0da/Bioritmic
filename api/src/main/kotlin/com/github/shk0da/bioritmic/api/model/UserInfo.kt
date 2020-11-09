package com.github.shk0da.bioritmic.api.model

import com.fasterxml.jackson.annotation.JsonFormat
import com.github.shk0da.bioritmic.api.domain.User
import java.util.*

data class UserInfo(val name: String?,
                    val email: String?,
                    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy") val birthday: Date?) : BasicPresentation {

    companion object {
        fun of(user: User): UserInfo {
            return UserInfo(name = user.name, email = user.email, birthday = Date(user.birthday!!.time))
        }

        fun listOf(users: List<User>): List<UserInfo> {
            return users.map { of(it) }
        }
    }
}