package com.github.shk0da.bioritmic.api.model.search

import java.util.*

data class UserSearch(val userId: Long,
                      val birthdate: Date,
                      val gender: Gender? = null,
                      val ageMin: Int? = null,
                      val ageMax: Int? = null,
                      val distance: Double? = null)