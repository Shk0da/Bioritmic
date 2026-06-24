package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.domain.UserPhoto
import com.github.shk0da.bioritmic.api.domain.UserSettings
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.gis.GisDataModel
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.model.search.Gender.MAN
import com.github.shk0da.bioritmic.api.model.search.Gender.WOMAN
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.api.repository.GisDataRepository
import com.github.shk0da.bioritmic.api.repository.UserBlockRepository
import com.github.shk0da.bioritmic.api.repository.UserPhotoRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserSettingsRepository
import com.github.shk0da.bioritmic.api.utils.ImageUtils
import com.github.shk0da.bioritmic.api.utils.ImageUtils.ImageTag
import com.github.shk0da.bioritmic.api.utils.StringUtils.isNotBlank
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.reactor.awaitSingle
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.http.codec.multipart.FilePart
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.IOException
import java.lang.System.currentTimeMillis
import java.sql.Timestamp

@Suppress("TooManyFunctions")
@Service
class UserService(
    val userRepository: UserRepository,
    val gisDataRepository: GisDataRepository,
    val userSettingsRepository: UserSettingsRepository,
    val userBlockRepository: UserBlockRepository,
    val emailService: EmailService,
    val s3Service: S3Service,
    val userPhotoRepository: UserPhotoRepository
) {

    companion object {
        private const val CONTENT_TYPE_JPEG = "image/jpeg"
    }

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

    @Transactional(readOnly = true)
    suspend fun getPhoto(userId: Long): ByteArray {
        if (!userRepository.existsById(userId)) {
            throw ApiException(ErrorCode.USER_NOT_FOUND)
        }
        val s3Key = ImageUtils.s3KeyForPhoto(userId, ImageTag.CROPP_250x250)
        return s3Service.downloadPhoto(s3Key) ?: ImageUtils.defaultNoImage()
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
    suspend fun isBlockedBy(userId: Long, currentUserId: Long): Boolean {
        return userBlockRepository.findByUserIdAndOtherUserId(userId, currentUserId) != null
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

    @Transactional
    suspend fun deleteUserById(userId: Long) {
        deleteUserS3Photos(userId)
        userRepository.deleteById(userId)
    }

    private suspend fun deleteUserS3Photos(userId: Long) {
        val keys = ImageTag.entries.map { ImageUtils.s3KeyForPhoto(userId, it) }
        s3Service.deletePhotos(keys)
        userPhotoRepository.deleteAllByUserId(userId)
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
        val userSettings = userSettingsRepository.findById(userId) ?: UserSettings().apply {
            ageMin = 18
            ageMax = 45
            distance = 30.0
            gender = (if (MAN.ordinal.toShort() == userRepository.findById(userId)?.gender)
                WOMAN.ordinal else MAN.ordinal).toShort()
        }
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

    suspend fun updatePhoto(userId: Long, filePart: FilePart) {
        try {
            val originalBytes = withContext(Dispatchers.IO) {
                val dataBuffer = filePart.content().reduce { a, b -> a.write(b) }.awaitSingle()
                val bytes = ByteArray(dataBuffer.readableByteCount())
                dataBuffer.read(bytes)
                bytes
            }

            val tagsToUpload = listOf(ImageTag.ORIGINAL, ImageTag.CROPP_100x100, ImageTag.CROPP_250x250)
            tagsToUpload.forEach { tag ->
                val cropped = ImageUtils.cropImageBytes(originalBytes, tag)
                val s3Key = ImageUtils.s3KeyForPhoto(userId, tag)
                s3Service.uploadPhoto(s3Key, cropped, CONTENT_TYPE_JPEG)
            }

            userPhotoRepository.deleteAllByUserId(userId)
            tagsToUpload.forEachIndexed { index, tag ->
                userPhotoRepository.save(
                    UserPhoto().apply {
                        this.userId = userId
                        photoOrder = index
                        s3Key = ImageUtils.s3KeyForPhoto(userId, tag)
                        contentType = CONTENT_TYPE_JPEG
                        createdAt = Timestamp(currentTimeMillis())
                    }
                )
            }

            log.info("Photos uploaded to S3 for userId: {}", userId)
        } catch (ex: IOException) {
            log.error("Failed to save photos for userId [{}]: {}", userId, ex.message)
        }
    }

    suspend fun deletePhoto(userId: Long) {
        deleteUserS3Photos(userId)
    }
}
