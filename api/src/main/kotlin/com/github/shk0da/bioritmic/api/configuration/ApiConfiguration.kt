package com.github.shk0da.bioritmic.api.configuration

import org.springframework.context.annotation.Configuration
import java.time.ZoneOffset
import java.util.*
import javax.annotation.PostConstruct

@Configuration
class ApiConfiguration {

    @PostConstruct
    fun defaultTimezone() {
        Locale.setDefault(Locale.US)
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneOffset.UTC))
    }
}
