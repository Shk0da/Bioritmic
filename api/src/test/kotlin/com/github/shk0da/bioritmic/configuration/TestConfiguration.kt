package com.github.shk0da.bioritmic.configuration

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import io.restassured.RestAssured
import io.restassured.config.EncoderConfig
import io.restassured.config.LogConfig
import io.restassured.config.ObjectMapperConfig
import io.restassured.config.RestAssuredConfig
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class TestConfiguration {

    @Bean
    fun configureRestAssured(): RestAssuredConfig {
        return RestAssured.config()
                .logConfig(LogConfig
                        .logConfig()
                        .enableLoggingOfRequestAndResponseIfValidationFails())
                .encoderConfig(EncoderConfig
                        .encoderConfig()
                        .appendDefaultContentCharsetToContentTypeIfUndefined(false))
                .objectMapperConfig(ObjectMapperConfig
                        .objectMapperConfig()
                        .jackson2ObjectMapperFactory { _, _ -> getObjectMapper() })
    }

    private fun getObjectMapper(): ObjectMapper {
        val objectMapper = ObjectMapper()
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL)
        return objectMapper
    }
}