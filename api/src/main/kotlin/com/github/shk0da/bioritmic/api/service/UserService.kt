package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
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
import com.github.shk0da.bioritmic.api.repository.GisDataRepository
import com.github.shk0da.bioritmic.api.repository.UserBlockRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserSettingsRepository
import com.github.shk0da.bioritmic.api.utils.ImageUtils
import com.github.shk0da.bioritmic.api.utils.ImageUtils.ImageTag
import com.github.shk0da.bioritmic.api.utils.ImageUtils.cropAndSaveUserImage
import com.github.shk0da.bioritmic.api.utils.ImageUtils.deleteUserImages
import com.github.shk0da.bioritmic.api.utils.ImageUtils.profileImagePath
import com.github.shk0da.bioritmic.api.utils.StringUtils.isNotBlank
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.reactor.awaitSingle
import kotlinx.coroutines.time.withTimeout
import org.slf4j.LoggerFactory
import org.springframework.http.codec.multipart.FilePart
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.File
import java.lang.System.currentTimeMillis
import java.nio.file.Files.readAllBytes
import java.sql.Timestamp
import java.time.Duration

@Service
class UserService(
    val userRepository: UserRepository,
    val gisDataRepository: GisDataRepository,
    val userSettingsRepository: UserSettingsRepository,
    val userBlockRepository: UserBlockRepository,
    val emailService: EmailService
) {

    private val log = LoggerFactory.getLogger(UserService::class.java)

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun findUserByEmail(email: String): User? {
        return userRepository.findByEmail(email)
    }

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun isUserExists(email: String): Boolean {
        return userRepository.existsByEmail(email)
    }

    @Transactional(readOnly = true)
    suspend fun findUserById(id: Long): User? {
        return userRepository.findById(id)
    }

    @Transactional
    suspend fun blockedUsers(userId: Long, pageable: PageableRequest): List<User> {
        val users = userBlockRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
        val ids = users.map { it.otherUserId!! }
        return userRepository.findAllById(ids).toList()
    }

    @Transactional
    suspend fun blockUser(userId: Long, otherUserId: Long): User {
        val user = userRepository.findById(otherUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        userBlockRepository.insert(userId, otherUserId, Timestamp(currentTimeMillis()))
        return user
    }

    @Transactional
    suspend fun unblockUser(userId: Long, otherUserId: Long): User {
        val user = userRepository.findById(otherUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        userBlockRepository.delete(userId, otherUserId)
        return user
    }

    @Transactional(readOnly = true)
    suspend fun findUserByIdWithSettings(id: Long): User {
        val user = userRepository.findById(id) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val settings = userSettingsRepository.findById(user.id!!)
        user.userSettings = settings
        return user
    }

    suspend fun createNewUser(userModel: UserModel): User {
        return userRepository.save(User.of(userModel))
    }

    @Transactional
    suspend fun updateUserById(userId: Long, userInfo: UserInfo): User {
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
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
        return userRepository.save(user)
    }

    @Transactional
    suspend fun updateEmail(user: User, email: String): User {
        if (isUserExists(email)) throw ApiException(ErrorCode.USER_EXISTS)
        user.resetRecoveryCode()
        user.email = email
        return userRepository.save(user)
    }

    @Transactional(readOnly = true)
    suspend fun deleteUserById(userId: Long) {
        userRepository.deleteById(userId)
        deleteUserImages(userId)
    }

    @Transactional(readOnly = true)
    suspend fun getGis(userId: Long): GisData {
        return gisDataRepository.findById(userId) ?: throw ApiException(ErrorCode.COORDINATES_NOT_FOUND)
    }

    @Transactional
    suspend fun saveGis(userId: Long, gisDataModel: GisDataModel): GisDataModel {
        val gisData = GisData.of(userId, gisDataModel)
        gisDataRepository.insert(
            gisData.userId,
            gisData.lat,
            gisData.lon,
            gisData.timestamp,
        )
        return GisDataModel.of(gisData)
    }

    @Transactional
    suspend fun getUserSettingsById(userId: Long): UserSettings {
        return userSettingsRepository.findById(userId) ?: throw ApiException(ErrorCode.SETTINGS_NOT_FOUND)
    }

    @Transactional
    suspend fun updateUserSettingsById(userId: Long, settings: UserSettingsModel): UserSettings {
        val userSettings = userSettingsRepository.findById(userId) ?: throw ApiException(ErrorCode.SETTINGS_NOT_FOUND)
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
        return userSettingsRepository.save(userSettings)
    }

    @Transactional
    suspend fun getPhoto(userId: Long): ByteArray {
        if (!userRepository.existsById(userId)) {
            throw ApiException(ErrorCode.USER_NOT_FOUND)
        }
        val photo = File(profileImagePath(userId))
        if (!photo.exists()) {
            return readAllBytes(ImageUtils.noImageFile.toPath())
        }
        return readAllBytes(photo.toPath())
    }

    suspend fun updatePhoto(userId: Long, filePart: FilePart) {
        try {
            val originalFile = File(profileImagePath(userId, ImageTag.ORIGINAL))
            withTimeout(Duration.ofSeconds(3)) {
                filePart.transferTo(originalFile).and {
                    cropAndSaveUserImage(userId, originalFile, ImageTag.CROPP_100x100)
                    cropAndSaveUserImage(userId, originalFile, ImageTag.CROPP_250x250)
                }.awaitSingle()
            }
            log.info("Photo saved to : ${originalFile.toPath()}")
        } catch (ex: Exception) {
            log.error("Failed save photos for userId [{}]: {}", userId, ex.message)
        }
    }

    suspend fun deletePhoto(userId: Long) {
        deleteUserImages(userId)
    }
}
