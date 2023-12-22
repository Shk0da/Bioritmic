package com.github.shk0da.bioritmic.ui

import org.springframework.boot.actuate.autoconfigure.security.servlet.ManagementWebSecurityAutoConfiguration
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration
import org.springframework.boot.runApplication

@SpringBootApplication(exclude = [
    DataSourceAutoConfiguration::class,
    SecurityAutoConfiguration::class,
    UserDetailsServiceAutoConfiguration::class,
    ManagementWebSecurityAutoConfiguration::class
])
class UIApplication

fun main(args: Array<String>) {
    runApplication<UIApplication>(*args)
}
