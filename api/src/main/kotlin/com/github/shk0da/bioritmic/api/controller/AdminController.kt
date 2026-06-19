package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.repository.ReportRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/admin")
class AdminController(
    val reportRepository: ReportRepository,
    val userRepository: UserRepository
) {

    private val log = LoggerFactory.getLogger(AdminController::class.java)

    private fun requireAdmin() {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth == null || !auth.authorities.contains(SimpleGrantedAuthority(ROLE_ADMIN))) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required")
        }
    }

    @GetMapping(value = ["/reports"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listReports(): List<Map<String, Any?>> {
        requireAdmin()
        val reports = reportRepository.findAllPending()
        return reports.map { report ->
            mapOf(
                "id" to report.id,
                "reporterId" to report.reporterId,
                "reportedId" to report.reportedId,
                "reason" to report.reason,
                "description" to report.description,
                "status" to report.status,
                "createdAt" to report.createdAt
            )
        }
    }

    @PutMapping(value = ["/reports/{id}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun updateReport(@PathVariable id: Long, @RequestBody request: AdminReportUpdateRequest): ResponseEntity<Map<String, Boolean>> {
        requireAdmin()
        reportRepository.updateStatus(id, request.status)
        log.info("Admin updated report id={} to status={}", id, request.status)
        return ResponseEntity.ok(mapOf("success" to true))
    }

    @GetMapping(value = ["/verifications"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listUnverifiedUsers(): List<Map<String, Any?>> {
        requireAdmin()
        val users = userRepository.findUnverifiedUsers()
        return users.map { user ->
            mapOf(
                "id" to user.id,
                "name" to user.name,
                "email" to user.email,
                "verified" to user.isVerified
            )
        }
    }

    @PutMapping(value = ["/verifications/{userId}/approve"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun approveVerification(@PathVariable userId: Long): ResponseEntity<Map<String, Boolean>> {
        requireAdmin()
        userRepository.setVerified(userId, true)
        log.info("Admin approved verification for userId={}", userId)
        return ResponseEntity.ok(mapOf("success" to true))
    }

    @PutMapping(value = ["/verifications/{userId}/reject"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun rejectVerification(@PathVariable userId: Long): ResponseEntity<Map<String, Boolean>> {
        requireAdmin()
        userRepository.setVerified(userId, false)
        log.info("Admin rejected verification for userId={}", userId)
        return ResponseEntity.ok(mapOf("success" to true))
    }
}

data class AdminReportUpdateRequest(
    val status: String
)
