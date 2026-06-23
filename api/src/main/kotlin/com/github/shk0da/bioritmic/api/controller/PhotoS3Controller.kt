package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.S3Service
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/photos")
class PhotoS3Controller(
    private val s3Service: S3Service
) {

    @GetMapping(value = ["/s3/{s3Key}"], produces = [MediaType.IMAGE_JPEG_VALUE])
    suspend fun getPhotoFromS3(@PathVariable s3Key: String): ByteArray {
        return s3Service.downloadPhoto(s3Key) ?: ByteArray(0)
    }
}
