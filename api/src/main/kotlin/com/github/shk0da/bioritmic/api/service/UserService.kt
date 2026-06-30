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
import com.github.shk0da.bioritmic.api.model.user.PhotoDisplaySize
import com.github.shk0da.bioritmic.api.model.user.UpdateUserProfileRequest
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.model.user.UserSettingsModel
import com.github.shk0da.bioritmic.api.model.user.UserStatusPosition
import com.github.shk0da.bioritmic.api.repository.GisDataRepository
import com.github.shk0da.bioritmic.api.constants.ProfileStatusConstants.ALLOWED_STATUS_EMOJIS
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_BANNED
import com.github.shk0da.bioritmic.api.repository.UserBlockRepository
import com.github.shk0da.bioritmic.api.repository.UserPhotoRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.repository.UserSettingsRepository
import com.github.shk0da.bioritmic.api.utils.ImageUtils
import com.github.shk0da.bioritmic.api.utils.ImageUtils.ImageTag
import com.github.shk0da.bioritmic.api.utils.StringUtils.isNotBlank
import com.github.shk0da.bioritmic.api.utils.ValidateUtils
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
import java.util.UUID

@Suppress("TooManyFunctions")
@Service
class UserService(
    val userRepository: UserRepository,
    val gisDataRepository: GisDataRepository,
    val userSettingsRepository: UserSettingsRepository,
    val userBlockRepository: UserBlockRepository,
    val emailService: EmailService,
    val s3Service: S3Service,
    val userPhotoRepository: UserPhotoRepository,
    val authService: AuthService,
    val userRoleRepository: UserRoleRepository,
    val reportService: ReportService
) {

    companion object {
        private const val CONTENT_TYPE_JPEG = "image/jpeg"
        private const val BIO_MAX_LENGTH = 500
        private const val STATUS_EMOJI_MAX_LENGTH = 16
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
    suspend fun findUserById(id: UUID): User? {
        return userRepository.findById(id)
    }

    @Transactional(readOnly = true)
    suspend fun isUserBanned(userId: UUID): Boolean {
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (roles.any { it == ROLE_BANNED || it == "BANNED" }) {
            return true
        }
        return reportService.isUserBanned(userId)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun getPhoto(userId: UUID, displaySize: PhotoDisplaySize = PhotoDisplaySize.THUMB): ByteArray {
        if (!userRepository.existsById(userId)) {
            throw ApiException(ErrorCode.USER_NOT_FOUND)
        }
        if (userPhotoRepository.findAllByUserId(userId).isEmpty()) {
            return ImageUtils.defaultNoImage()
        }
        for (tag in displaySize.preferredTags()) {
            val s3Key = ImageUtils.s3KeyForPhoto(userId, tag)
            s3Service.downloadPhoto(s3Key)?.let { return it }
        }
        return ImageUtils.defaultNoImage()
    }

    @Transactional
    suspend fun blockedUsers(userId: UUID, pageable: PageableRequest): List<User> {
        val users = userBlockRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
        val ids = users.map { it.otherUserId!! }
        return userRepository.findAllById(ids).toList()
    }

    @Transactional
    suspend fun blockUser(userId: UUID, otherUserId: UUID): User {
        val user = userRepository.findById(otherUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        userBlockRepository.insert(userId, otherUserId, Timestamp(currentTimeMillis()))
        return user
    }

    @Transactional
    suspend fun unblockUser(userId: UUID, otherUserId: UUID): User {
        val user = userRepository.findById(otherUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        userBlockRepository.delete(userId, otherUserId)
        return user
    }

    @Transactional(readOnly = true)
    suspend fun isBlockedBy(userId: UUID, currentUserId: UUID): Boolean {
        return userBlockRepository.findByUserIdAndOtherUserId(userId, currentUserId) != null
    }

    @Transactional(readOnly = true)
    suspend fun hasBlocked(userId: UUID, otherUserId: UUID): Boolean {
        return userBlockRepository.findByUserIdAndOtherUserId(userId, otherUserId) != null
    }

    @Transactional(readOnly = true)
    suspend fun countBlockedUsers(userId: UUID): Long {
        return userBlockRepository.countByUserId(userId)
    }

    @Transactional(readOnly = true)
    suspend fun findUserByIdWithSettings(id: UUID): User {
        val user = userRepository.findById(id) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        user.userSettings = resolveUserSettings(user.id!!)
        return user
    }

    suspend fun createNewUser(userModel: UserModel): User {
        return userRepository.save(User.of(userModel))
    }

    @Transactional
    suspend fun updateUserById(userId: UUID, request: UpdateUserProfileRequest): User {
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        if (isNotBlank(request.name)) {
            user.name = request.name
        }
        if (isNotBlank(request.email) && !user.email.equals(request.email)) {
            if (isUserExists(request.email!!)) throw ApiException(ErrorCode.USER_EXISTS)
            user.setRecoveryCode()
            emailService.sendConfirmationChangeEmail(user.email!!, request.email, user.recoveryCode!!)
        }
        if (null != request.birthday) {
            ValidateUtils.validateMinimumAge(request.birthday)
            user.birthday = Timestamp(request.birthday.time)
        }
        if (null != request.gender) {
            user.setGender(request.gender)
        }
        if (request.bio != null) {
            val trimmed = request.bio.trim()
            if (trimmed.length > BIO_MAX_LENGTH) {
                throw ApiException(
                    ErrorCode.INVALID_PARAMETER,
                    mapOf(Pair(com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME, "bio"))
                )
            }
            user.bio = trimmed.ifEmpty { null }
        }
        if (request.statusEmoji != null) {
            val trimmed = request.statusEmoji.trim()
            if (trimmed.length > STATUS_EMOJI_MAX_LENGTH) {
                throw ApiException(
                    ErrorCode.INVALID_PARAMETER,
                    mapOf(Pair(com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME, "statusEmoji"))
                )
            }
            user.statusEmoji = trimmed.ifEmpty { null }
            if (user.statusEmoji != null && user.statusEmoji !in ALLOWED_STATUS_EMOJIS) {
                throw ApiException(
                    ErrorCode.INVALID_PARAMETER,
                    mapOf(Pair(com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME, "statusEmoji"))
                )
            }
            if (user.statusEmoji == null) {
                user.statusPosition = null
            }
        }
        if (request.statusPosition != null && user.statusEmoji != null) {
            user.statusPosition = request.statusPosition.name
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
    suspend fun deleteUserById(userId: UUID) {
        deleteUserS3Photos(userId)
        authService.deleteAuthByUserId(userId)
        userRepository.deleteById(userId)
    }

    private suspend fun deleteUserS3Photos(userId: UUID) {
        val keys = ImageTag.entries.map { ImageUtils.s3KeyForPhoto(userId, it) }
        s3Service.deletePhotos(keys)
        userPhotoRepository.deleteAllByUserId(userId)
    }

    @Transactional(readOnly = true)
    suspend fun findGis(userId: UUID): GisData? {
        return gisDataRepository.findById(userId)
    }

    @Transactional(readOnly = true)
    suspend fun getGis(userId: UUID): GisData {
        return findGis(userId) ?: throw ApiException(ErrorCode.COORDINATES_NOT_FOUND)
    }

    @Transactional
    suspend fun saveGis(userId: UUID, gisDataModel: GisDataModel): GisDataModel {
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
    suspend fun deleteGis(userId: UUID) {
        gisDataRepository.deleteById(userId)
    }

    @Transactional(readOnly = true)
    suspend fun getUserSettingsById(userId: UUID): UserSettings {
        return resolveUserSettings(userId)
    }

    @Transactional
    suspend fun updateUserSettingsById(userId: UUID, settings: UserSettingsModel): UserSettings {
        val userSettings = userSettingsRepository.findById(userId) ?: defaultUserSettingsFor(userId).apply {
            markAsNew()
        }
        with(userSettings) {
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

    private suspend fun resolveUserSettings(userId: UUID): UserSettings {
        return userSettingsRepository.findById(userId) ?: defaultUserSettingsFor(userId)
    }

    private suspend fun defaultUserSettingsFor(userId: UUID): UserSettings {
        val userGender = userRepository.findById(userId)?.gender
        return UserSettings().apply {
            this.userId = userId
            ageMin = 18
            ageMax = 45
            distance = 30.0
            gender = (if (MAN.ordinal.toShort() == userGender) WOMAN.ordinal else MAN.ordinal).toShort()
        }
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun updatePhoto(userId: UUID, filePart: FilePart) {
        val originalBytes = try {
            withContext(Dispatchers.IO) {
                val dataBuffer = filePart.content().reduce { a, b -> a.write(b) }.awaitSingle()
                val bytes = ByteArray(dataBuffer.readableByteCount())
                dataBuffer.read(bytes)
                bytes
            }
        } catch (ex: IOException) {
            log.error("Failed to read photo for userId [{}]: {}", userId, ex.message, ex)
            throw ApiException(ErrorCode.API_INTERNAL_ERROR)
        }

        val tagsToUpload = listOf(
            ImageTag.ORIGINAL,
            ImageTag.CROPP_500x500,
            ImageTag.CROPP_100x100,
            ImageTag.CROPP_250x250,
        )
        val croppedByTag = tagsToUpload.associateWith { tag ->
            ImageUtils.cropImageBytes(originalBytes, tag)
        }

        try {
            savePhotoMetadata(userId, tagsToUpload)
        } catch (ex: Exception) {
            log.error("Failed to save photo metadata for userId [{}]: {}", userId, ex.message, ex)
            throw ApiException(ErrorCode.API_INTERNAL_ERROR)
        }

        try {
            croppedByTag.forEach { (tag, cropped) ->
                val s3Key = ImageUtils.s3KeyForPhoto(userId, tag)
                s3Service.uploadPhoto(s3Key, cropped, CONTENT_TYPE_JPEG)
            }
            log.info("Photos uploaded to S3 for userId: {}", userId)
        } catch (ex: Exception) {
            log.error("Failed to upload photos to S3 for userId [{}]: {}", userId, ex.message, ex)
            try {
                userPhotoRepository.deleteAllByUserId(userId)
            } catch (rollbackEx: Exception) {
                log.error("Failed to rollback photo metadata for userId [{}]", userId, rollbackEx)
            }
            throw ApiException(ErrorCode.API_INTERNAL_ERROR)
        }
    }

    private suspend fun savePhotoMetadata(userId: UUID, tagsToUpload: List<ImageTag>) {
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
    }

    suspend fun deletePhoto(userId: UUID) {
        deleteUserS3Photos(userId)
    }
}
