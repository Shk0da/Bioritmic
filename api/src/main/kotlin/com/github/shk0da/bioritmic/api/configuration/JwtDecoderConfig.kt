package com.github.shk0da.bioritmic.api.configuration

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder

@Configuration
class JwtDecoderConfig {

    @Bean
    fun googleJwtDecoder(): JwtDecoder {
        val decoder = NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build()
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("https://accounts.google.com"))
        return decoder
    }

    @Bean
    fun appleJwtDecoder(): JwtDecoder {
        return NimbusJwtDecoder.withJwkSetUri("https://appleid.apple.com/keys").build()
    }
}
