package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.model.user.ReportRequest
import com.github.shk0da.bioritmic.api.service.ReportService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/report")
class ReportController(
    private val reportService: ReportService
) {

    private val log = LoggerFactory.getLogger(ReportController::class.java)

    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun createReport(@RequestBody request: ReportRequest): Map<String, Any?> {
        val reporterId = getUserId()
        val report = reportService.createReport(
            reporterId = reporterId,
            reportedId = request.reportedUserId,
            reason = request.reason,
            description = request.description
        )
        return mapOf(
            "id" to report.id,
            "status" to report.status
        )
    }
}
