package com.github.shk0da.bioritmic.api.configuration

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.core.exception.SdkException
import software.amazon.awssdk.services.s3.model.CreateBucketRequest
import software.amazon.awssdk.services.s3.model.HeadBucketRequest
import java.net.URI

@Configuration
@ConditionalOnProperty(name = ["s3.enabled"], havingValue = "true", matchIfMissing = true)
class S3Configuration {

    private val log = LoggerFactory.getLogger(S3Configuration::class.java)

    @Value("\${s3.endpoint}")
    private lateinit var endpoint: String

    @Value("\${s3.access-key}")
    private lateinit var accessKey: String

    @Value("\${s3.secret-key}")
    private lateinit var secretKey: String

    @Value("\${s3.bucket}")
    private lateinit var bucket: String

    @Value("\${s3.region}")
    private lateinit var region: String

    @Bean
    fun s3Client(): S3Client {
        val credentials = AwsBasicCredentials.create(accessKey, secretKey)

        val s3Client = S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .region(Region.of(region))
            .forcePathStyle(true)
            .build()

        ensureBucketExists(s3Client)

        return s3Client
    }

    private fun ensureBucketExists(s3Client: S3Client) {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build())
        } catch (@Suppress("SwallowedException") e: SdkException) {
            log.debug("Bucket '{}' does not exist, creating...", bucket)
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build())
        }
    }
}
