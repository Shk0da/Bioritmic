package com.github.shk0da.bioritmic.api.model.search

import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.utils.ValidateUtils
import java.sql.Timestamp
import java.util.Date
import java.util.UUID
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min

data class UserSearch(
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    var userId: UUID? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    var birthdate: Date? = null,
    val gender: Gender? = null,
    @field:Min(MIN_AGE.toLong()) @field:Max(MAX_AGE.toLong()) val ageMin: Int? = null,
    @field:Min(MIN_AGE.toLong()) @field:Max(MAX_AGE.toLong()) val ageMax: Int? = null,
    @field:DecimalMin(MIN_DISTANCE) @field:DecimalMax(MAX_DISTANCE) val distance: Double = defaultDistance,
) : BasicPresentation {

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    var timestamp: Timestamp = Timestamp(0)

    companion object {

        private const val MIN_AGE = 14
        private const val MAX_AGE = 100
        private const val MIN_DISTANCE = "0.05"
        private const val MAX_DISTANCE = "100"
        const val defaultDistance = 1.0

        fun of(user: User): UserSearch {
            val settings = user.userSettings
            return UserSearch(
                userId = user.id!!,
                birthdate = user.birthday!!,
                gender = settings?.getGender(),
                ageMin = settings?.ageMin,
                ageMax = settings?.ageMax,
                distance = settings?.distance ?: defaultDistance
            )
        }
    }

    fun withUser(user: User): UserSearch {
        this.userId = user.id!!
        this.birthdate = user.birthday!!
        return this
    }

    fun withTimestamp(timestamp: Timestamp): UserSearch {
        this.timestamp = timestamp
        return this
    }

    fun validate() {
        ValidateUtils.validate(ageMin, ageMax, distance)
    }
}
