package com.github.shk0da.bioritmic.api.model.user

import com.github.shk0da.bioritmic.api.domain.UserSettings
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.utils.ValidateUtils
import org.springframework.validation.annotation.Validated
import javax.validation.constraints.DecimalMax
import javax.validation.constraints.DecimalMin
import javax.validation.constraints.Max
import javax.validation.constraints.Min

@Validated
data class UserSettingsModel(val gender: Gender? = null,
                             @Min(14) @Max(100) val ageMin: Int? = null,
                             @Min(14) @Max(100) val ageMax: Int? = null,
                             @DecimalMin("0.05") @DecimalMax("30") val distance: Double? = null) : BasicPresentation {
    companion object {
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