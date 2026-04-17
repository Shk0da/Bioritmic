package com.github.shk0da.bioritmic.api.controller.users

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.INVALID_PARAMETER
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserInfo.Companion.ofWithCompare
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkFileExtension
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkNotEmpty
import org.slf4j.LoggerFactory
import org.springdoc.core.annotations.ParameterObject
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.codec.multipart.FilePart
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import reactor.core.publisher.Mono
import java.lang.Long.valueOf
import java.security.Principal
import java.util.Date
import javax.validation.Valid
import javax.validation.constraints.NotNull

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class UserController(val userService: UserService) {

    private val log = LoggerFactory.getLogger(UserController::class.java)

    // GET /me <- UserInfo
    @GetMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun me(): UserInfo {
        val userId = getUserId()
        return UserInfo.of(userService.findUserById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND))
    }

    // PUT/PATH /me -> UserInfo
    @RequestMapping(value = ["/me"], method = [RequestMethod.PATCH, RequestMethod.PUT], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun update(@RequestBody @Valid userInfo: UserInfo, principal: Principal): UserInfo {
        val userId = getUserId(principal)
        return UserInfo.of(userService.updateUserById(userId, userInfo))
    }

    // DELETE /me -> send email with approve ??
    @DeleteMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteMe() {
        val userId = getUserId()
        userService.deleteUserById(userId)
    }

    // GET /user/{id} <- UserInfo. id - hash?? of real id
    @GetMapping(value = ["/{id}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun user(@PathVariable id: Long): UserInfo {
        val currentUserId = getUserId()
        val user = userService.findUserById(valueOf(id)) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val currentUser = userService.findUserById(currentUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        return if (null != user.birthday && null != currentUser.birthday) {
            ofWithCompare(user, Date(currentUser.birthday!!.toInstant().toEpochMilli()))
        } else {
            UserInfo.of(user)
        }
    }

    // GET /blocked <- UserInfo
    @GetMapping(value = ["/blocked"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun blockedUsers(@ParameterObject pageable: Pageable): List<UserInfo> {
        val userId = getUserId()
        return userService.blockedUsers(userId, of(pageable)).map { UserInfo.of(it) }
    }

    // PUT /user/{id}/block <- UserInfo
    @PutMapping(value = ["/{id}/block"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun blockUser(@PathVariable id: Long): UserInfo {
        val userId = getUserId()
        return UserInfo.of(userService.blockUser(userId, id))
    }

    // PUT /user/{id}/block <- unblock
    @PutMapping(value = ["/{id}/unblock"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unblockUser(@PathVariable id: Long): UserInfo {
        val userId = getUserId()
        return UserInfo.of(userService.unblockUser(userId, id))
    }

    // GET /me/gis <- GIS
    @GetMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meGis(): GisDataModel {
        val userId = getUserId()
        val gisData = userService.getGis(userId)
        log.debug("User gisData: {}", gisData)
        return GisDataModel.of(gisData)
    }

    // POST /me/gis -> UpdateGIS (+ anti SPAM in radius 100km[param] in hour)
    @PostMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meSaveGis(@RequestBody @Valid gisData: GisDataModel, principal: Principal): GisDataModel {
        val userId = getUserId(principal)
        val gisData = userService.saveGis(userId, gisData)
        log.debug("New gisData: {}", gisData)
        return gisData
    }

    // GET /{id}/photo <- UserInfo
    @GetMapping(value = ["/{id}/photo"], produces = [MediaType.IMAGE_JPEG_VALUE])
    suspend fun photo(@PathVariable id: String): ByteArray {
        val userId = valueOf(id)
        return userService.getPhoto(userId)
    }

    // GET /me/photo <- UserInfo
    @GetMapping(value = ["/me/photo"], produces = [MediaType.IMAGE_JPEG_VALUE])
    suspend fun mePhoto(): ByteArray {
        val userId = getUserId()
        return userService.getPhoto(userId)
    }

    // POST /me/photo -> UserInfo
    @PostMapping(value = ["/me/photo"], consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    suspend fun uploadPhoto(@RequestPart("file") file: Mono<@Valid @NotNull FilePart>, principal: Principal): ResponseEntity<Void> {
        val userId = getUserId(principal)
        val checkedFilePart = file
            .filter { checkNotEmpty(it.filename(), INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "file"))) }
            .filter { checkFileExtension(it.filename(), arrayListOf("png", "jpg"), INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "file"))) }
        userService.updatePhoto(userId, checkedFilePart.block()!!)
        log.debug("Update photo: {}", userId)
        return ResponseEntity.status(HttpStatus.ACCEPTED).build()
    }

    // DELETE /me/photo
    @DeleteMapping(value = ["/me/photo"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deletePhoto(): ResponseEntity<Void> {
        val userId = getUserId()
        userService.deletePhoto(userId)
        log.debug("Deleted all photo for userId: {}", userId)
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build()
    }
}
