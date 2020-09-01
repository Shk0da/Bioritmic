package com.github.shk0da.bioritmic.api.model

import org.springframework.security.oauth2.core.OAuth2AccessToken
import org.springframework.security.oauth2.core.OAuth2RefreshToken

data class UserToken(val name: String,
                     val email: String,
                     val accessToken: OAuth2AccessToken?,
                     val refreshToken: OAuth2RefreshToken?) : BasicPresentation