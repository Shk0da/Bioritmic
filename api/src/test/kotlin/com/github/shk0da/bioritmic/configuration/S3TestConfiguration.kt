package com.github.shk0da.bioritmic.configuration

import org.mockito.Mockito.mock
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.context.annotation.Profile
import software.amazon.awssdk.services.s3.S3Client

@Configuration
@Profile(value = ["pg_embedded"])
class S3TestConfiguration {

    @Bean
    @Primary
    fun testS3Client(): S3Client {
        return mock(S3Client::class.java)
    }
}
