package com.github.shk0da.bioritmic.api.model.user

data class MatchesResponse(
    val matches: List<UserInfo> = emptyList(),
    val count: Int = 0,
    val blurred: Boolean = false
)
