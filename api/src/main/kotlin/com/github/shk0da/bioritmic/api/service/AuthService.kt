package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.UserModel
import org.springframework.stereotype.Service

@Service
class AuthService {

    fun createNewUser(userModel: UserModel): User {
        return User(1, userModel.name, userModel.email)
    }
}
