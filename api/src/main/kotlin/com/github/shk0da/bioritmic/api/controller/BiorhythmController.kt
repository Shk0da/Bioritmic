package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.service.BiorhythmDetail
import com.github.shk0da.bioritmic.api.service.BiorhythmService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.http.MediaType.APPLICATION_JSON_VALUE
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.Date
import java.util.UUID

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/biorhythm")
class BiorhythmController(
    val userService: UserService
) {

    @Suppress("ThrowsCount")
    @GetMapping(value = ["/{userId}/detail"], produces = [APPLICATION_JSON_VALUE])
    suspend fun getBiorhythmDetail(@PathVariable userId: UUID): BiorhythmDetail {
        val currentUserId = getUserId()
        if (currentUserId == userId) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER,
                mapOf(ErrorCode.Constants.PARAMETER_NAME to "userId")
            )
        }
        val currentUser = userService.findUserById(currentUserId)
            ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val otherUser = userService.findUserById(userId)
            ?: throw ApiException(ErrorCode.USER_NOT_FOUND)

        val birthDate1 = Date(currentUser.birthday!!.toInstant().toEpochMilli())
        val birthDate2 = Date(otherUser.birthday!!.toInstant().toEpochMilli())

        return BiorhythmService.instance.detailCompare(birthDate1, birthDate2)
    }
}
