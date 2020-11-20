package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.domain.UserSettings
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.api.repository.jpa.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.GisDataR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserSettingsR2dbcRepository
import com.github.shk0da.bioritmic.api.utils.ImageUtils
import com.github.shk0da.bioritmic.api.utils.ImageUtils.ImageTag
import com.github.shk0da.bioritmic.api.utils.ImageUtils.cropAndSaveUserImage
import com.github.shk0da.bioritmic.api.utils.ImageUtils.deleteUserImages
import com.github.shk0da.bioritmic.api.utils.ImageUtils.profileImagePath
import com.github.shk0da.bioritmic.api.utils.StringUtils.isNotBlank
import org.slf4j.LoggerFactory
import org.springframework.http.codec.multipart.FilePart
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono
import reactor.core.publisher.Mono.just
import java.io.File
import java.nio.file.Files.readAllBytes
import java.sql.Timestamp

@Service
class UserService(val userJpaRepository: UserJpaRepository,
                  val userR2dbcRepository: UserR2dbcRepository,
                  val gisDataR2dbcRepository: GisDataR2dbcRepository,
                  val userSettingsR2dbcRepository: UserSettingsR2dbcRepository,
                  val emailService: EmailService) {

    private val log = LoggerFactory.getLogger(UserService::class.java)

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun findUserByEmail(email: String): User? {
        return userJpaRepository.findByEmail(email)
    }

    @Transactional(readOnly = true, transactionManager = jpaTransactionManager)
    fun isUserExists(email: String): Boolean {
        return userJpaRepository.existsByEmail(email)
    }

    @Transactional(readOnly = true)
    fun findUserById(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
    }

    @Transactional(readOnly = true)
    fun findUserByIdWithSettings(id: Long): Mono<User> {
        return userR2dbcRepository.findById(id)
                .map { user ->
                    userSettingsR2dbcRepository.findById(user.id!!)
                            .map {
                                user.userSettings = it
                                user
                            }
                            .switchIfEmpty(just(user))
                }
                .flatMap { it }
    }

    @Transactional
    fun createNewUser(userModel: UserModel): Mono<User> {
        return userR2dbcRepository.save(User.of(userModel))
    }

    @Transactional
    fun updateUserById(userId: Long, userInfo: UserInfo): Mono<User> {
        return userR2dbcRepository.findById(userId)
                .map { user ->
                    with(userInfo) {
                        if (isNotBlank(name)) {
                            user.name = name
                        }
                        if (isNotBlank(email) && !user.email.equals(email)) {
                            if (isUserExists(email!!)) throw ApiException(ErrorCode.USER_EXISTS)
                            user.setRecoveryCode()
                            emailService.sendConfirmationChangeEmail(user.email!!, email, user.recoveryCode!!)
                        }
                        if (null != birthday) {
                            user.birthday = Timestamp(birthday.time)
                        }
                    }
                    userR2dbcRepository.save(user)
                }
                .flatMap { it }
    }

    @Transactional
    fun updateEmail(user: User, email: String): Mono<User> {
        if (isUserExists(email)) throw ApiException(ErrorCode.USER_EXISTS)
        user.resetRecoveryCode()
        user.email = email
        return userR2dbcRepository.save(user)
    }

    @Transactional(readOnly = true)
    fun deleteUserById(userId: Long): Mono<Void> {
        return userR2dbcRepository.deleteById(userId)
                .doOnSuccess {
                    deleteUserImages(userId)
                }
    }

    @Transactional(readOnly = true)
    fun getGis(userId: Long): Mono<GisData> {
        return gisDataR2dbcRepository.findById(userId)
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.COORDINATES_NOT_FOUND)))
    }

    @Transactional
    fun saveGis(userId: Long, gisDataModel: GisDataModel): Mono<GisDataModel> {
        val gisData = GisData.of(userId, gisDataModel)
        return gisDataR2dbcRepository.insert(
                gisData.userId,
                gisData.lat,
                gisData.lon,
                gisData.timestamp,
        ).map { GisDataModel.of(gisData) }
    }

    @Transactional
    fun getUserSettingsById(userId: Long): Mono<UserSettings> {
        return userSettingsR2dbcRepository.findById(userId)
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.SETTINGS_NOT_FOUND)))
    }

    @Transactional
    fun updateUserSettingsById(userId: Long, settings: UserSettingsModel): Mono<UserSettings> {
        return userSettingsR2dbcRepository.findById(userId)
                .switchIfEmpty(just(UserSettings()))
                .map { userSettings ->
                    with(userSettings) {
                        if (null == this.userId) {
                            markAsNew()
                        }
                        this.userId = userId
                        if (null != settings.gender) {
                            gender = settings.gender.ordinal.toShort()
                        }
                        if (null != settings.ageMin) {
                            ageMin = settings.ageMin
                        }
                        if (null != settings.ageMax) {
                            ageMax = settings.ageMax
                        }
                        if (null != settings.distance) {
                            distance = settings.distance
                        }
                    }
                    userSettingsR2dbcRepository.save(userSettings)
                }
                .flatMap { it }
    }

    @Transactional
    fun getPhoto(userId: Long): Mono<ByteArray> {
        return userR2dbcRepository.existsById(userId)
                .filter { it == true }
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.USER_NOT_FOUND)))
                .map { File(profileImagePath(userId)) }
                .filter { it.exists() }
                .switchIfEmpty(just(ImageUtils.noImageFile))
                .map { readAllBytes(it.toPath()) }
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.IMAGE_NOT_FOUND)))
    }

    fun updatePhoto(userId: Long, filePart: Mono<FilePart>): Mono<Void> {
        val originalFile = File(profileImagePath(userId, ImageTag.ORIGINAL))
        return filePart
                .flatMap { it.transferTo(originalFile) }
                .doOnSuccess {
                    cropAndSaveUserImage(userId, originalFile, ImageTag.CROPP_100x100)
                    cropAndSaveUserImage(userId, originalFile, ImageTag.CROPP_250x250)
                }
                .doOnError {
                    log.error("Failed save photos for userId [{}]: {}", userId, it.message)
                    Mono.error<Mono<Void>>(it)
                }
    }

    fun deletePhoto(userId: Long): Mono<Any> {
        return just(deleteUserImages(userId))
    }
}
