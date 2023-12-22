package com.github.shk0da.bioritmic.api.configuration

import org.springframework.context.annotation.Configuration
import java.time.ZoneOffset
import java.util.Locale
import java.util.TimeZone
import javax.annotation.PostConstruct

@Configuration
class ApiConfiguration {

    companion object {
        val defaultZone: ZoneOffset = ZoneOffset.UTC
        val defaultLocale: Locale = Locale.US
    }

    @PostConstruct
    fun defaultTimezone() {
        Locale.setDefault(defaultLocale)
        TimeZone.setDefault(TimeZone.getTimeZone(defaultZone))
    }
}
