package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.S3MediaAccessService
import com.github.shk0da.bioritmic.api.service.S3Service
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ServerWebExchange

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/photos")
class PhotoS3Controller(
    private val s3Service: S3Service,
    private val s3MediaAccessService: S3MediaAccessService,
) {

    @GetMapping("/s3/**")
    suspend fun getPhotoFromS3(exchange: ServerWebExchange): ResponseEntity<ByteArray> {
        val userId = getUserId()
        val requestPath = exchange.request.path.pathWithinApplication().value()
        val s3Key = requestPath.removePrefix(S3_PATH_PREFIX)
        if (s3Key.isBlank() || s3Key == requestPath) {
            return ResponseEntity.notFound().build()
        }
        if (!s3MediaAccessService.canAccessMedia(userId, s3Key)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build()
        }
        val bytes = s3Service.downloadPhoto(s3Key) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .contentType(mediaTypeForKey(s3Key))
            .body(bytes)
    }

    private fun mediaTypeForKey(key: String): MediaType {
        val extension = key.substringAfterLast('.', "").lowercase()
        val path = key.lowercase()
        return when (extension) {
            "png" -> MediaType.IMAGE_PNG
            "gif" -> MediaType.IMAGE_GIF
            "webp" -> MediaType.parseMediaType("image/webp")
            "jpg", "jpeg" -> MediaType.IMAGE_JPEG
            "ogg" -> MediaType.parseMediaType("audio/ogg")
            "m4a" -> MediaType.parseMediaType("audio/mp4")
            "mp4" -> if (path.contains("/mailbox/voice/")) {
                MediaType.parseMediaType("audio/mp4")
            } else {
                MediaType.parseMediaType("video/mp4")
            }
            "webm" -> if (path.contains("/mailbox/voice/")) {
                MediaType.parseMediaType("audio/webm")
            } else {
                MediaType.parseMediaType("video/webm")
            }
            else -> MediaType.IMAGE_JPEG
        }
    }

    companion object {
        private val S3_PATH_PREFIX = "${ApiRoutes.API_WITH_VERSION_1}/photos/s3/"
    }
}
