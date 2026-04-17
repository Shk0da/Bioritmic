package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.domain.UserSettings
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.api.repository.GisDataJpaRepository
import com.github.shk0da.bioritmic.api.repository.UserBlockJpaRepository
import com.github.shk0da.bioritmic.api.repository.UserJpaRepository
import com.github.shk0da.bioritmic.api.repository.UserSettingsJpaRepository
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
import java.io.File
import java.lang.System.currentTimeMillis
import java.nio.file.Files.readAllBytes
import java.sql.Timestamp
import kotlin.jvm.optionals.getOrNull

@Service
class UserService(
    val userJpaRepository: UserJpaRepository,
    val gisDataJpaRepository: GisDataJpaRepository,
    val userSettingsJpaRepository: UserSettingsJpaRepository,
    val userBlockJpaRepository: UserBlockJpaRepository,
    val emailService: EmailService
) {

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
    fun findUserById(id: Long): User? {
        return userJpaRepository.findById(id).getOrNull()
    }

    @Transactional
    fun blockedUsers(userId: Long, pageable: PageableRequest): List<User> {
        val users = userBlockJpaRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
        val ids = users.map { it.otherUserId!! }
        return userJpaRepository.findAllById(ids)
    }

    @Transactional
    fun blockUser(userId: Long, otherUserId: Long): User {
        val user = userJpaRepository.findById(otherUserId).getOrNull() ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        userBlockJpaRepository.insert(userId, otherUserId, Timestamp(currentTimeMillis()))
        return user
    }

    @Transactional
    fun unblockUser(userId: Long, otherUserId: Long): User {
        val user = userJpaRepository.findById(otherUserId).getOrNull() ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        userBlockJpaRepository.delete(userId, otherUserId)
        return user
    }

    @Transactional(readOnly = true)
    suspend fun findUserByIdWithSettings(id: Long): User {
        val user = userJpaRepository.findById(id).getOrNull() ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val settings = userSettingsJpaRepository.findById(user.id!!).getOrNull()
        user.userSettings = settings
        return user
    }

    @Transactional
    fun createNewUser(userModel: UserModel): User {
        return userJpaRepository.save(User.of(userModel))
    }

    @Transactional
    fun updateUserById(userId: Long, userInfo: UserInfo): User {
        val user = userJpaRepository.findById(userId).getOrNull() ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
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
        return userJpaRepository.save(user)
    }

    @Transactional
    fun updateEmail(user: User, email: String): User {
        if (isUserExists(email)) throw ApiException(ErrorCode.USER_EXISTS)
        user.resetRecoveryCode()
        user.email = email
        return userJpaRepository.save(user)
    }

    @Transactional(readOnly = true)
    fun deleteUserById(userId: Long) {
        userJpaRepository.deleteById(userId)
        deleteUserImages(userId)
    }

    @Transactional(readOnly = true)
    fun getGis(userId: Long): GisData {
        return gisDataJpaRepository.findById(userId).getOrNull() ?: throw ApiException(ErrorCode.COORDINATES_NOT_FOUND)
    }

    @Transactional
    suspend fun saveGis(userId: Long, gisDataModel: GisDataModel): GisDataModel {
        val gisData = GisData.of(userId, gisDataModel)
        gisDataJpaRepository.insert(
            gisData.userId,
            gisData.lat,
            gisData.lon,
            gisData.timestamp,
        )
        return GisDataModel.of(gisData)
    }

    @Transactional
    fun getUserSettingsById(userId: Long): UserSettings {
        return userSettingsJpaRepository.findById(userId).getOrNull() ?: throw ApiException(ErrorCode.SETTINGS_NOT_FOUND)
    }

    @Transactional
    fun updateUserSettingsById(userId: Long, settings: UserSettingsModel): UserSettings {
        val userSettings = userSettingsJpaRepository.findById(userId).getOrNull() ?: throw ApiException(ErrorCode.SETTINGS_NOT_FOUND)
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
        return userSettingsJpaRepository.save(userSettings)
    }

    @Transactional
    fun getPhoto(userId: Long): ByteArray {
        if (!userJpaRepository.existsById(userId)) {
            throw ApiException(ErrorCode.USER_NOT_FOUND)
        }
        val photo = File(profileImagePath(userId))
        if (!photo.exists()) {
            return readAllBytes(ImageUtils.noImageFile.toPath())
        }
        return readAllBytes(photo.toPath())
    }

    fun updatePhoto(userId: Long, filePart: FilePart) {
        val originalFile = File(profileImagePath(userId, ImageTag.ORIGINAL))
        try {
            filePart.transferTo(originalFile)
            cropAndSaveUserImage(userId, originalFile, ImageTag.CROPP_100x100)
            cropAndSaveUserImage(userId, originalFile, ImageTag.CROPP_250x250)
        } catch (ex: Exception) {
            log.error("Failed save photos for userId [{}]: {}", userId, ex.message)
        }
    }

    fun deletePhoto(userId: Long) {
        deleteUserImages(userId)
    }
}
