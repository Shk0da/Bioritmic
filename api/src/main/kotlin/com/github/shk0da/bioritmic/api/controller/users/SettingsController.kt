package com.github.shk0da.bioritmic.api.controller.users

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.RestController
import java.security.Principal
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user/settings")
class SettingsController(val userService: UserService) {

    private val log = LoggerFactory.getLogger(SettingsController::class.java)

    // GET /user/settings <- UserSettings
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun settings(): UserSettingsModel {
        val userId = getUserId()
        return UserSettingsModel.of(userService.getUserSettingsById(userId))
    }

    // POST/PUT/PATH /user/settings -> UserSettings
    @RequestMapping(
        method = [RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT],
        produces = [MediaType.APPLICATION_JSON_VALUE]
    )
    suspend fun updateSettings(
        @Valid @RequestBody settings: UserSettingsModel, principal: Principal
    ): UserSettingsModel {
        settings.validate()
        val userId = getUserId(principal)
        return UserSettingsModel.of(userService.updateUserSettingsById(userId, settings))
    }
}
