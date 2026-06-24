package com.github.shk0da.bioritmic.api.service

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.core.exception.SdkException
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.io.ByteArrayInputStream

@Service
class S3Service(
    private val s3Client: S3Client
) {

    private val log = LoggerFactory.getLogger(S3Service::class.java)

    @Value("\${s3.bucket}")
    private lateinit var bucket: String

    suspend fun uploadPhoto(key: String, data: ByteArray, contentType: String): String = withContext(Dispatchers.IO) {
        val request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .build()

        s3Client.putObject(request, RequestBody.fromInputStream(ByteArrayInputStream(data), data.size.toLong()))

        log.debug("Uploaded photo to S3: {}/{}", bucket, key)
        key
    }

    suspend fun downloadPhoto(key: String): ByteArray? = withContext(Dispatchers.IO) {
        try {
            val request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build()

            val response = s3Client.getObject(request)
            response?.readAllBytes()
        } catch (e: SdkException) {
            log.error("Failed to download photo from S3: {}/{}", bucket, key, e)
            null
        }
    }

    suspend fun deletePhoto(key: String) = withContext(Dispatchers.IO) {
        try {
            val request = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build()

            s3Client.deleteObject(request)
            log.debug("Deleted photo from S3: {}/{}", bucket, key)
        } catch (e: SdkException) {
            log.error("Failed to delete photo from S3: {}/{}", bucket, key, e)
        }
    }

    suspend fun deletePhotos(keys: List<String>) {
        if (keys.isEmpty()) return
        keys.forEach { deletePhoto(it) }
    }

    fun getPhotoUrl(key: String): String {
        return "/api/v1/photos/s3/$key"
    }
}
