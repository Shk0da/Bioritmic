package com.github.shk0da.bioritmic.api.model.search

import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.utils.ValidateUtils
import java.sql.Timestamp
import java.util.*
import java.util.concurrent.TimeUnit
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min

data class UserSearch(@JsonProperty(access = JsonProperty.Access.READ_ONLY)
                      var userId: Long? = null,
                      @JsonProperty(access = JsonProperty.Access.READ_ONLY)
                      var birthdate: Date? = null,
                      val gender: Gender? = null,
                      @field:Min(14) @field:Max(100) val ageMin: Int? = null,
                      @field:Min(14) @field:Max(100) val ageMax: Int? = null,
                      @field:DecimalMin("0.05") @field:DecimalMax("30") val distance: Double = defaultDistance,
                      var timestamp: Timestamp = hourAgo()) : BasicPresentation {

    companion object {

        val defaultDistance = 1.0

        private fun hourAgo(): Timestamp = Timestamp(System.currentTimeMillis() - TimeUnit.HOURS.toMillis(1))

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
        this.timestamp = if (timestamp.time > hourAgo().time) timestamp else hourAgo()
        return this
    }

    fun validate() {
        ValidateUtils.validate(ageMin, ageMax, distance)
    }
}