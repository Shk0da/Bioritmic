package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonFormat
import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.service.BiorhythmService
import com.github.shk0da.bioritmic.api.utils.ImageUtils
import java.time.Duration
import java.time.Instant
import java.util.Date
import java.util.UUID

data class UserInfo(
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val id: UUID? = null,
    val name: String? = null,
    val nick: String? = null,
    val email: String? = null,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    val birthday: Date? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val age: Int? = null,
    val gender: Gender? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val horo: Int? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val compare: HashMap<String, Double>? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val isBioCompatible: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val isHoroCompatible: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val isFullCompatible: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val image: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val lat: Double? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val lon: Double? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val distance: Double? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val isPro: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val role: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val isVerified: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val isBanned: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val isOnline: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val lastActiveAt: String? = null,
    val bio: String? = null,
    val statusEmoji: String? = null,
    val statusPosition: String? = null,
) : BasicPresentation {

    companion object {

        private val biorhythmService: BiorhythmService = BiorhythmService.instance

        fun adminSummary(user: User): UserInfo {
            val birthday = user.birthday
            return UserInfo(
                id = user.id,
                name = user.name,
                email = user.email,
                age = birthday?.let { biorhythmService.calculateAge(Date(it.time)) },
                isVerified = user.isVerified,
                isOnline = isOnline(user.lastActiveAt?.toInstant()),
                lastActiveAt = user.lastActiveAt?.toInstant()?.toString()
            )
        }

        fun of(user: User): UserInfo {
            return UserInfo(
                id = user.id,
                name = user.name,
                email = user.email,
                nick = user.nick,
                birthday = Date(user.birthday!!.time),
                gender = user.getGender(),
                horo = biorhythmService.getNumZodiac(Date(user.birthday!!.time)),
                image = ImageUtils.getProfileImageUri(user.id!!),
                isVerified = user.isVerified,
                isOnline = isOnline(user.lastActiveAt?.toInstant()),
                lastActiveAt = user.lastActiveAt?.toInstant()?.toString(),
                bio = user.bio,
                statusEmoji = user.statusEmoji,
                statusPosition = user.statusPosition
            )
        }

        fun ofWithoutEmail(user: User): UserInfo {
            return UserInfo(
                id = user.id,
                name = user.name,
                nick = user.nick,
                birthday = Date(user.birthday!!.time),
                gender = user.getGender(),
                horo = biorhythmService.getNumZodiac(Date(user.birthday!!.time)),
                image = ImageUtils.getProfileImageUri(user.id!!),
                isVerified = user.isVerified,
                isOnline = isOnline(user.lastActiveAt?.toInstant()),
                lastActiveAt = user.lastActiveAt?.toInstant()?.toString(),
                bio = user.bio,
                statusEmoji = user.statusEmoji,
                statusPosition = user.statusPosition
            )
        }

        fun of(gisUser: GisUser): UserInfo {
            return UserInfo(
                id = gisUser.id,
                name = gisUser.name,
                age = biorhythmService.calculateAge(Date(gisUser.birthday!!.time)),
                gender = gisUser.getGender(),
                horo = biorhythmService.getNumZodiac(Date(gisUser.birthday!!.time)),
                lat = gisUser.lat,
                lon = gisUser.lon,
                distance = gisUser.distance,
                image = ImageUtils.getProfileImageUri(gisUser.id!!),
                isOnline = isOnline(gisUser.lastActiveAt?.toInstant()),
                lastActiveAt = gisUser.lastActiveAt?.toInstant()?.toString(),
                statusEmoji = gisUser.statusEmoji,
                statusPosition = gisUser.statusPosition
            )
        }

        fun ofWithCompare(gisUser: GisUser, meBirthday: Date): UserInfo {
            val gisUserBirthday = Date(gisUser.birthday!!.time)
            val compare = biorhythmService.compare(meBirthday, gisUserBirthday)
            val isBioCompatible = biorhythmService.boolCompare(compare)
            val isHoroCompatible = biorhythmService.horoCompare(gisUserBirthday, meBirthday)
            val isFullCompatible = isBioCompatible && isHoroCompatible
            return UserInfo(
                id = gisUser.id,
                name = gisUser.name,
                age = biorhythmService.calculateAge(Date(gisUser.birthday!!.time)),
                gender = gisUser.getGender(),
                horo = biorhythmService.getNumZodiac(Date(gisUser.birthday!!.time)),
                lat = gisUser.lat,
                lon = gisUser.lon,
                distance = gisUser.distance,
                compare = compare,
                isBioCompatible = isBioCompatible,
                isHoroCompatible = isHoroCompatible,
                isFullCompatible = isFullCompatible,
                image = ImageUtils.getProfileImageUri(gisUser.id!!),
                isOnline = isOnline(gisUser.lastActiveAt?.toInstant()),
                lastActiveAt = gisUser.lastActiveAt?.toInstant()?.toString(),
                statusEmoji = gisUser.statusEmoji,
                statusPosition = gisUser.statusPosition
            )
        }

        fun ofWithCompare(user: User, meBirthday: Date): UserInfo {
            val gisUserBirthday = Date(user.birthday!!.time)
            val compare = biorhythmService.compare(meBirthday, gisUserBirthday)
            val isBioCompatible = biorhythmService.boolCompare(compare)
            val isHoroCompatible = biorhythmService.horoCompare(gisUserBirthday, meBirthday)
            val isFullCompatible = isBioCompatible && isHoroCompatible
            return UserInfo(
                id = user.id,
                name = user.name,
                nick = user.nick,
                age = biorhythmService.calculateAge(Date(user.birthday!!.time)),
                gender = user.getGender(),
                horo = biorhythmService.getNumZodiac(Date(user.birthday!!.time)),
                compare = compare,
                isBioCompatible = isBioCompatible,
                isHoroCompatible = isHoroCompatible,
                isFullCompatible = isFullCompatible,
                image = ImageUtils.getProfileImageUri(user.id!!),
                isOnline = isOnline(user.lastActiveAt?.toInstant()),
                lastActiveAt = user.lastActiveAt?.toInstant()?.toString(),
                bio = user.bio,
                statusEmoji = user.statusEmoji,
                statusPosition = user.statusPosition
            )
        }

        private fun isOnline(lastActiveAt: Instant?): Boolean {
            if (lastActiveAt == null) return false
            return Duration.between(lastActiveAt, Instant.now()).seconds <= ONLINE_WINDOW_SECONDS
        }

        private const val ONLINE_WINDOW_SECONDS = 60L
    }
}
