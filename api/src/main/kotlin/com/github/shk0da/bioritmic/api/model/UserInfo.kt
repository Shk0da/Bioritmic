package com.github.shk0da.bioritmic.api.model

import com.fasterxml.jackson.annotation.JsonFormat
import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.service.BiorhythmService
import java.util.*

data class UserInfo(val id: Long? = null,
                    val name: String? = null,
                    val email: String? = null,
                    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy")
                    val birthday: Date? = null,
                    val age: Int? = null,
                    val compare: HashMap<String, Double>? = null,
                    val isBioCompatible: Boolean? = null,
                    val isHoroCompatible: Boolean? = null,
                    val isFullCompatible: Boolean? = null,
                    val image: String? = null,
                    val lat: Double? = null,
                    val lon: Double? = null,
                    val distance: Double? = null) : BasicPresentation {

    companion object {

        private val biorhythmService: BiorhythmService = BiorhythmService.instance

        fun of(user: User): UserInfo {
            return UserInfo(name = user.name, email = user.email, birthday = Date(user.birthday!!.time))
        }

        fun of(gisUser: GisUser): UserInfo {
            return UserInfo(
                    id = gisUser.id,
                    name = gisUser.name,
                    age = biorhythmService.calculateAge(Date(gisUser.birthday!!.time)),
                    lat = gisUser.lat,
                    lon = gisUser.lon,
                    distance = gisUser.distance
            )
        }

        fun ofWithCompare(gisUser: GisUser, meBirthday: Date): UserInfo {
            val gisUserBirthday = Date(gisUser.birthday!!.time)
            val compare = biorhythmService.compare(gisUserBirthday, meBirthday)
            val isBioCompatible = biorhythmService.boolCompare(compare)
            val isHoroCompatible = biorhythmService.horoCompare(gisUserBirthday, meBirthday)
            val isFullCompatible = isBioCompatible && isHoroCompatible
            return UserInfo(
                    id = gisUser.id,
                    name = gisUser.name,
                    age = biorhythmService.calculateAge(Date(gisUser.birthday!!.time)),
                    lat = gisUser.lat,
                    lon = gisUser.lon,
                    distance = gisUser.distance,
                    compare = compare,
                    isBioCompatible = isBioCompatible,
                    isHoroCompatible = isHoroCompatible,
                    isFullCompatible = isFullCompatible
            )
        }
    }
}