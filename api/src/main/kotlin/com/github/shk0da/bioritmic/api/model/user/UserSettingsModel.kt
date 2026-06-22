package com.github.shk0da.bioritmic.api.model.user

import com.github.shk0da.bioritmic.api.domain.UserSettings
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.utils.ValidateUtils
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min

data class UserSettingsModel(
    val gender: Gender? = null,
    @field:Min(MIN_AGE.toLong()) @field:Max(MAX_AGE.toLong()) val ageMin: Int? = null,
    @field:Min(MIN_AGE.toLong()) @field:Max(MAX_AGE.toLong()) val ageMax: Int? = null,
    @field:DecimalMin(MIN_DISTANCE) @field:DecimalMax(MAX_DISTANCE) val distance: Double? = null
) : BasicPresentation {
    companion object {
        private const val MIN_AGE = 14
        private const val MAX_AGE = 100
        private const val MIN_DISTANCE = "0.05"
        private const val MAX_DISTANCE = "100"

        fun of(settings: UserSettings): UserSettingsModel {
            return UserSettingsModel(
                gender = settings.getGender(),
                ageMin = settings.ageMin,
                ageMax = settings.ageMax,
                distance = settings.distance
            )
        }
    }

    fun validate() {
        ValidateUtils.validate(ageMin, ageMax, distance)
    }
}
