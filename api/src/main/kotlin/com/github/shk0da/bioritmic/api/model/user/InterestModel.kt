package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.Interest

data class InterestModel(
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val id: Long? = null,
    val name: String? = null,
    val category: String? = null,
    val icon: String? = null
) {
    companion object {
        fun of(interest: Interest): InterestModel {
            return InterestModel(
                id = interest.id,
                name = interest.name,
                category = interest.category,
                icon = interest.icon
            )
        }
    }
}
