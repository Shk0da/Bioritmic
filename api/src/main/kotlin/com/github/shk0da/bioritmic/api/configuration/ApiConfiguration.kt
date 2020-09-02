package com.github.shk0da.bioritmic.api.configuration

import org.springframework.context.annotation.Configuration
import org.springframework.retry.annotation.EnableRetry
import java.time.ZoneOffset
import java.util.*
import javax.annotation.PostConstruct

@EnableRetry
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
