package com.github.shk0da.bioritmic.api.model.user

import com.github.shk0da.bioritmic.api.domain.UserSettings
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.google.common.collect.ImmutableMap
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
                    gender = settings.gender,
                    ageMin = settings.ageMin,
                    ageMax = settings.ageMax,
                    distance = settings.distance
            )
        }
    }

    fun validate() {
        if (null != ageMin && ageMin!! < 14) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, ImmutableMap.of(
                    ErrorCode.Constants.PARAMETER_NAME, "ageMin",
                    ErrorCode.Constants.PARAMETER_VALUE, ageMin.toString()
            ))
        }

        if (null != ageMax && ageMax!! > 100) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, ImmutableMap.of(
                    ErrorCode.Constants.PARAMETER_NAME, "ageMax",
                    ErrorCode.Constants.PARAMETER_VALUE, ageMax.toString()
            ))
        }

        if (null != ageMin && null != ageMax && (ageMin!! > ageMax!!)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, ImmutableMap.of(ErrorCode.Constants.PARAMETER_NAME, "ageMin, ageMax"))
        }

        if (null != distance && (distance!! < 0.05 || distance!! > 30.0)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER_WITH_VALUE, ImmutableMap.of(
                    ErrorCode.Constants.PARAMETER_NAME, "distance",
                    ErrorCode.Constants.PARAMETER_VALUE, distance.toString()
            ))
        }
    }
}