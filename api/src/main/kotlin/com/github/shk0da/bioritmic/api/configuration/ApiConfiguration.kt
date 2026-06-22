package com.github.shk0da.bioritmic.api.configuration

import org.springframework.context.annotation.Configuration
import java.time.ZoneOffset
import java.util.Locale
import java.util.TimeZone

@Suppress("UtilityClassWithPublicConstructor")
@Configuration
class ApiConfiguration {

    init {
        Locale.setDefault(defaultLocale)
        TimeZone.setDefault(TimeZone.getTimeZone(defaultZone))
    }

    companion object {
        val defaultZone: ZoneOffset = ZoneOffset.UTC
        val defaultLocale: Locale = Locale.US
    }
}
