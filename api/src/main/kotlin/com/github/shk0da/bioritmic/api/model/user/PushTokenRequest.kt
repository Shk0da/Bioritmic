package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty

data class PushTokenRequest(
    val token: String,
    val platform: String // "web", "android", "ios"
)
