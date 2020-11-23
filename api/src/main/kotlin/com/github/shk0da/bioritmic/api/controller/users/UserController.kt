package com.github.shk0da.bioritmic.api.controller.users

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.INVALID_PARAMETER
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkFileExtension
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkNotEmpty
import io.swagger.annotations.ApiImplicitParam
import io.swagger.annotations.ApiImplicitParams
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Pageable
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.codec.multipart.FilePart
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import java.lang.Long.valueOf
import java.security.Principal
import javax.validation.Valid
import javax.validation.constraints.NotNull

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class UserController(val userService: UserService) {

    private val log = LoggerFactory.getLogger(UserController::class.java)

    // GET /me <- UserInfo
    @GetMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun me(): Mono<UserInfo> {
        val userId = getUserId()
        return userService.findUserById(userId).map { UserInfo.of(it) }
    }

    // PUT/PATH /me -> UserInfo
    @RequestMapping(value = ["/me"], method = [RequestMethod.PATCH, RequestMethod.PUT], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun update(@RequestBody @Valid userInfo: UserInfo, principal: Principal): Mono<UserInfo> {
        val userId = getUserId(principal)
        return userService.updateUserById(userId, userInfo).map { UserInfo.of(it) }
    }

    // DELETE /me -> send email with approve ??
    @DeleteMapping(value = ["/me"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun deleteMe(): Mono<Void> {
        val userId = getUserId()
        return userService.deleteUserById(userId)
    }

    // GET /user/{id} <- UserInfo. id - hash?? of real id
    @GetMapping(value = ["/{id}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun user(@PathVariable id: Long): Mono<UserInfo> {
        val userId = valueOf(id)
        return userService.findUserById(userId)
                .map { UserInfo.of(it) }
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.USER_NOT_FOUND)))
    }

    // GET /blocked <- UserInfo
    @GetMapping(value = ["/blocked"], produces = [MediaType.APPLICATION_JSON_VALUE])
    @ApiImplicitParams(value = [
        ApiImplicitParam(name = "page", dataType = "java.lang.Integer", paramType = "query"),
        ApiImplicitParam(name = "size", dataType = "java.lang.Integer", paramType = "query")
    ])
    fun blockedUsers(pageable: Pageable): Flux<UserInfo> {
        val userId = getUserId()
        return userService.blockedUsers(userId, of(pageable)).map { UserInfo.of(it) }
    }

    // PUT /user/{id}/block <- UserInfo
    @PutMapping(value = ["/{id}/block"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun blockUser(@PathVariable id: Long): Mono<UserInfo> {
        val userId = getUserId()
        return userService.blockUser(userId, id).map { UserInfo.of(it) }
    }

    // PUT /user/{id}/block <- unblock
    @PutMapping(value = ["/{id}/unblock"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun unblockUser(@PathVariable id: Long): Mono<UserInfo> {
        val userId = getUserId()
        return userService.unblockUser(userId, id).map { UserInfo.of(it) }
    }

    // GET /me/gis <- GIS
    @GetMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun meGis(): Mono<ResponseEntity<GisDataModel>> {
        val userId = getUserId()
        return userService.getGis(userId)
                .map { GisDataModel.of(it) }
                .map {
                    log.debug("User gisData: {}", it)
                    ResponseEntity.status(HttpStatus.OK).body(it)
                }
    }

    // POST /me/gis -> UpdateGIS (+ anti SPAM in radius 100km[param] in hour)
    @PostMapping(value = ["/me/gis"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun meSaveGis(@RequestBody @Valid gisData: GisDataModel, principal: Principal): Mono<ResponseEntity<GisDataModel>> {
        val userId = getUserId(principal)
        return userService.saveGis(userId, gisData)
                .map {
                    log.debug("New gisData: {}", it)
                    ResponseEntity.status(HttpStatus.OK).body(it)
                }
    }

    // GET /{id}/photo <- UserInfo
    @GetMapping(value = ["/{id}/photo"], produces = [MediaType.IMAGE_JPEG_VALUE])
    fun photo(@PathVariable id: String): Mono<ByteArray> {
        val userId = valueOf(id)
        return userService.getPhoto(userId)
    }

    // GET /me/photo <- UserInfo
    @GetMapping(value = ["/me/photo"], produces = [MediaType.IMAGE_JPEG_VALUE])
    fun mePhoto(): Mono<ByteArray> {
        val userId = getUserId()
        return userService.getPhoto(userId)
    }

    // POST /me/photo -> UserInfo
    @PostMapping(value = ["/me/photo"], consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadPhoto(@RequestPart("file") file: Mono<@Valid @NotNull FilePart>, principal: Principal): Mono<ResponseEntity<Void>> {
        val userId = getUserId(principal)
        val checkedFilePart = file
                .filter { checkNotEmpty(it.filename(), INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "file"))) }
                .filter { checkFileExtension(it.filename(), arrayListOf("png", "jpg"), INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "file"))) }
        return userService.updatePhoto(userId, checkedFilePart)
                .map {
                    log.debug("Update photo: {}", userId)
                    ResponseEntity.status(HttpStatus.ACCEPTED).build()
                }
    }

    // DELETE /me/photo
    @DeleteMapping(value = ["/me/photo"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun deletePhoto(): Mono<ResponseEntity<Void>> {
        val userId = getUserId()
        return userService.deletePhoto(userId)
                .map {
                    log.debug("Deleted all photo for userId: {}", userId)
                    ResponseEntity.status(HttpStatus.NO_CONTENT).build()
                }
    }
}