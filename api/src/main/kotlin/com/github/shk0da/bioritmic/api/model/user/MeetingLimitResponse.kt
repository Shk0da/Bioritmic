package com.github.shk0da.bioritmic.api.model.user

data class MeetingLimitResponse(
    val totalCount: Int,
    val totalLimit: Int,
    val dailyCount: Int,
    val dailyLimit: Int,
)
