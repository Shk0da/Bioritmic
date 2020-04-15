package com.github.shk0da.bioritmic.api.controller.v1.rest.users

import io.ktor.application.ApplicationCall
import io.ktor.http.HttpStatusCode
import io.ktor.request.receive
import io.ktor.response.respond

class RegistrationController(private val createUser: CreateUser, private val findUser: FindUser, private val loginUser: LoginUser) {

    suspend fun userLogin(call: ApplicationCall) {
        val email = call.request.queryParameters[UserWebPath.LOGIN_EMAIL]
        val password = call.request.queryParameters[UserWebPath.LOGIN_PASSWORD]
        if (email == null || password == null) {
            call.respond(HttpStatusCode.BadRequest, "email or password is missing")
        } else {
            val user = loginUser.login(email, password)
            return call.respond(UserWeb.toUserWeb(user))
        }
    }

    suspend fun createUser(call: ApplicationCall) {
        val userWeb = call.receive<UserWeb>()
        return try {
            val user = createUser.create(userWeb.toUser())
            call.respond(HttpStatusCode.Created, UserWeb.toUserWeb(user))
        } catch (e: UserAlreadyExistsException) {
            call.respond(HttpStatusCode.Conflict, "User already exists:${e.message}")
        }
    }

    suspend fun getUser(call: ApplicationCall) {
        val id = call.parameters[userId]!!
        val user = findUser.findById(id)
        return if (user.isPresent) {
            call.respond(UserWeb.toUserWeb(user.get()))
        } else {
            call.respond(HttpStatusCode.NotFound, "User $id not found")
        }
    }

    suspend fun getAllUsers(call: ApplicationCall) {
        return call.respond(findUser.findAllUsers().map { user -> UserWeb.toUserWeb(user) })
    }
}
