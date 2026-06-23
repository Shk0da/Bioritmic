package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.codec.multipart.FilePart
import javax.validation.constraints.NotNull

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class VerifyController {

    private val log = LoggerFactory.getLogger(VerifyController::class.java)

    @PostMapping(value = ["/me/verify"], consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    suspend fun requestVerification(
        @RequestPart("photo") @NotNull file: FilePart
    ): Map<String, Any> {
        val userId = getUserId()
        log.info("Verification request from userId: {}", userId)
        return mapOf(
            "success" to true,
            "status" to "PENDING"
        )
    }
}
