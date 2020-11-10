package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonFormat
import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.utils.StringUtils.isNotBlank
import java.util.*

data class UserModel(@JsonProperty(access = JsonProperty.Access.READ_ONLY) val id: Long? = null,
                     val name: String,
                     val email: String,
                     @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy") val birthday: Date,
                     @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) val password: String? = null) : BasicPresentation {

    companion object {
        fun of(user: User): UserModel {
            return UserModel(id = user.id, name = user.name!!, email = user.email!!, birthday = user.birthday!!)
        }
    }

    @JsonIgnore
    fun isFilledInput(): Boolean {
        return isNotBlank(name) && isNotBlank(email) && isNotBlank(password)
    }

    override fun toString(): String {
        return "User(id=$id, name='$name', email='$email, birthday='$birthday')"
    }
}