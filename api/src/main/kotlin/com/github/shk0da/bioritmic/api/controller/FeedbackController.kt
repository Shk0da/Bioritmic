package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.FeedbackService
import com.github.shk0da.bioritmic.api.service.S3Service
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.http.codec.multipart.FilePart
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/feedback")
class FeedbackController(
    private val feedbackService: FeedbackService,
    private val s3Service: S3Service
) {

    private val log = LoggerFactory.getLogger(FeedbackController::class.java)

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun createFeedback(
        @RequestPart("topic") topic: String,
        @RequestPart("message") message: String,
        @RequestPart("file", required = false) file: FilePart?
    ): Map<String, Any?> {
        val userId = getUserId()
        val feedback = feedbackService.createFeedback(userId, topic, message, file)
        log.debug("Feedback submitted by user {}", userId)
        return mapOf(
            "id" to feedback.id,
            "status" to feedback.status,
            "attachment_url" to feedback.attachmentS3Key?.let { s3Service.getPhotoUrl(it) }
        )
    }
}
