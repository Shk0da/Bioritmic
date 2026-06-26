package com.github.shk0da.bioritmic.api.configuration

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(AppSecurityProperties::class, AppMailProperties::class)
class AppConfiguration
