package com.github.shk0da.bioritmic.api.model

import com.github.shk0da.bioritmic.api.domain.User

data class UserInfo(val name: String?, val email: String?) : BasicPresentation {

    companion object {
        fun of(user: User): UserInfo {
            return UserInfo(name = user.name, email = user.email)
        }
    }
}