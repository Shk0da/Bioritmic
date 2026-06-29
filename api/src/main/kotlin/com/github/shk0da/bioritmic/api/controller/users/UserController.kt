package com.github.shk0da.bioritmic.api.controller.users

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.INVALID_PARAMETER
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import com.github.shk0da.bioritmic.api.model.gis.GisEstimateModel
import com.github.shk0da.bioritmic.api.model.user.UpdateUserProfileRequest
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserInfo.Companion.ofWithCompare
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.service.GeoIpService
import com.github.shk0da.bioritmic.api.service.SubscriptionService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkFileExtension
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkNotEmpty
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springdoc.core.annotations.ParameterObject
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.codec.multipart.FilePart
import org.springframework.http.server.reactive.ServerHttpRequest
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
import java.security.Principal
import java.util.Date
import java.util.UUID
import javax.validation.Valid
import javax.validation.constraints.NotNull

@Suppress("TooManyFunctions")
@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class UserController(
    val userService: UserService,
    val subscriptionService: SubscriptionService,
    val userRoleRepository: UserRoleRepository,
    val geoIpService: GeoIpService
) {

    private val log = LoggerFactory.getLogger(UserController::class.java)

    // GET /me <- UserInfo
    @GetMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun me(): UserInfo {
        val userId = getUserId()
        val user = userService.findUserById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }.joinToString(",")
        val userInfo = UserInfo.of(user)
        return userInfo.copy(role = roles, isPro = subscriptionService.isProUser(userId))
    }

    // PUT/PATH /me -> UserInfo
    @RequestMapping(
        value = ["/me"],
        method = [RequestMethod.PATCH, RequestMethod.PUT],
        produces = [MediaType.APPLICATION_JSON_VALUE]
    )
    suspend fun update(@RequestBody @Valid request: UpdateUserProfileRequest, principal: Principal): UserInfo {
        val userId = getUserId(principal)
        return UserInfo.of(userService.updateUserById(userId, request))
    }

    // DELETE /me -> send email with approve ??
    @DeleteMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteMe() {
        val userId = getUserId()
        userService.deleteUserById(userId)
    }

    // GET /user/{id} <- UserInfo. id - hash?? of real id
    @GetMapping(value = ["/{id}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun user(@PathVariable id: UUID): UserInfo {
        val currentUserId = getUserId()
        val user = userService.findUserById(id) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val currentUser = userService.findUserById(currentUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val isBanned = userService.isUserBanned(id)
        val userInfo = if (null != user.birthday && null != currentUser.birthday) {
            ofWithCompare(user, Date(currentUser.birthday!!.toInstant().toEpochMilli()))
        } else {
            UserInfo.of(user)
        }
        return userInfo.copy(isBanned = isBanned)
    }

    // GET /blocked <- UserInfo
    @GetMapping(value = ["/blocked"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun blockedUsers(@ParameterObject pageable: Pageable): List<UserInfo> {
        val userId = getUserId()
        return userService.blockedUsers(userId, of(pageable)).map { UserInfo.ofWithoutEmail(it) }
    }

    // PUT /user/{id}/block <- UserInfo
    @PutMapping(value = ["/{id}/block"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun blockUser(@PathVariable id: UUID): UserInfo {
        val userId = getUserId()
        return UserInfo.ofWithoutEmail(userService.blockUser(userId, id))
    }

    // PUT /user/{id}/block <- unblock
    @PutMapping(value = ["/{id}/unblock"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unblockUser(@PathVariable id: UUID): UserInfo {
        val userId = getUserId()
        return UserInfo.ofWithoutEmail(userService.unblockUser(userId, id))
    }

    // GET /user/{id}/is-blocked-by <- check if current user is blocked by {id}
    @GetMapping(value = ["/{id}/is-blocked-by"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun isBlockedBy(@PathVariable id: UUID): Map<String, Boolean> {
        val currentUserId = getUserId()
        val blocked = userService.isBlockedBy(id, currentUserId)
        return mapOf("blocked" to blocked)
    }

    @GetMapping(value = ["/{id}/is-blocked"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun isBlocked(@PathVariable id: UUID): Map<String, Boolean> {
        val currentUserId = getUserId()
        return mapOf("blocked" to userService.hasBlocked(currentUserId, id))
    }

    @GetMapping(value = ["/blocked/count"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun blockedCount(): Map<String, Long> {
        val userId = getUserId()
        return mapOf("count" to userService.countBlockedUsers(userId))
    }

    // GET /me/gis <- GIS
    @GetMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meGis(): ResponseEntity<GisDataModel> {
        val userId = getUserId()
        val gisData = userService.findGis(userId) ?: return ResponseEntity.noContent().build()
        log.debug("User gisData: {}", gisData)
        return ResponseEntity.ok(GisDataModel.of(gisData))
    }

    // POST /me/gis -> UpdateGIS (+ anti SPAM in radius 100km[param] in hour)
    @PostMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meSaveGis(@RequestBody @Valid gisData: GisDataModel, principal: Principal): GisDataModel {
        val userId = getUserId(principal)
        val gisData = userService.saveGis(userId, gisData)
        log.debug("New gisData: {}", gisData)
        return gisData
    }

    // DELETE /me/gis
    @DeleteMapping(value = ["/me/gis"])
    suspend fun meDeleteGis(): ResponseEntity<Void> {
        val userId = getUserId()
        userService.deleteGis(userId)
        return ResponseEntity.noContent().build()
    }

    // GET /me/gis/estimate — approximate location by client IP (fallback when GPS is unavailable)
    @GetMapping(value = ["/me/gis/estimate"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun meGisEstimate(request: ServerHttpRequest): GisEstimateModel {
        getUserId()
        return geoIpService.estimateLocation(resolveClientIp(request))
    }

    // GET /{id}/photo <- UserInfo
    @GetMapping(value = ["/{id}/photo"], produces = [MediaType.IMAGE_JPEG_VALUE])
    suspend fun photo(@PathVariable id: UUID): ByteArray {
        return userService.getPhoto(id)
    }

    // GET /me/photo <- UserInfo
    @GetMapping(value = ["/me/photo"], produces = [MediaType.IMAGE_JPEG_VALUE])
    suspend fun mePhoto(): ByteArray {
        val userId = getUserId()
        return userService.getPhoto(userId)
    }

    // POST /me/photo -> UserInfo
    @PostMapping(value = ["/me/photo"], consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    suspend fun uploadPhoto(
        @RequestPart("file") file: @Valid @NotNull FilePart,
        principal: Principal
    ): ResponseEntity<Void> {
        val userId = getUserId(principal)
        val checkNotEmpty = checkNotEmpty(file.filename(), INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "file")))
        val checkFileExtension = checkFileExtension(
            file.filename(), arrayListOf("png", "jpg", "jpeg", "webp"),
            INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "file"))
        )
        if (!checkNotEmpty || !checkFileExtension) {
            throw ApiException(ErrorCode.BAD_PHOTO)
        }
        userService.updatePhoto(userId, file)
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

    private fun resolveClientIp(request: ServerHttpRequest): String? {
        request.headers.getFirst("X-Forwarded-For")
            ?.split(",")
            ?.firstOrNull()
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.let { return it }
        return request.remoteAddress?.address?.hostAddress
    }
}
