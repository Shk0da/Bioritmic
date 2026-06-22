package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.repository.ReportRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/admin")
class AdminController(
    val userRepository: UserRepository,
    val userRoleRepository: UserRoleRepository,
    val reportRepository: ReportRepository,
    val userService: UserService
) {

    private val log = LoggerFactory.getLogger(AdminController::class.java)

    private fun requireAdmin() {
        val userId = getUserId()
        val roles = runBlocking {
            userRoleRepository.findAllByUserId(userId).map { it.role }
        }
        if (UserRoleConstants.ROLE_ADMIN !in roles) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
    }

    @GetMapping(value = ["/dashboard"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun dashboard(): AdminDashboard {
        requireAdmin()
        val totalUsers = userRepository.countAll()
        val verifiedUsers = userRepository.countVerified()
        val unverifiedUsers = userRepository.countUnverified()
        val pendingReports = reportRepository.findAllPending().size

        return AdminDashboard(
            totalUsers = totalUsers,
            verifiedUsers = verifiedUsers,
            unverifiedUsers = unverifiedUsers,
            pendingReports = pendingReports
        )
    }

    @GetMapping(value = ["/users"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listUsers(): List<UserInfo> {
        requireAdmin()
        val users = userRepository.findAll().toList()
        return users.map { user ->
            val userId = user.id ?: return@map UserInfo.of(user)
            val roles = userRoleRepository.findAllByUserId(userId).joinToString(",") { it.role }
            UserInfo.of(user).copy(role = roles)
        }
    }

    @PostMapping(value = ["/users/{userId}/ban"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun banUser(@PathVariable userId: Long): Map<String, Any> {
        requireAdmin()
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (UserRoleConstants.ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot ban an admin"))
        }
        userRoleRepository.removeRole(userId, "USER")
        userRoleRepository.addRole(userId, "BANNED")
        log.warn("Admin banned user {}", userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/unban"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unbanUser(@PathVariable userId: Long): Map<String, Any> {
        requireAdmin()
        userRoleRepository.removeRole(userId, "BANNED")
        userRoleRepository.addRole(userId, "USER")
        log.info("Admin unbanned user {}", userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @DeleteMapping(value = ["/users/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteUser(@PathVariable userId: Long): Map<String, Any> {
        requireAdmin()
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (UserRoleConstants.ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot delete an admin"))
        }
        userService.deleteUserById(userId)
        log.warn("Admin deleted user {}", userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @GetMapping(value = ["/reports"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun pendingReports(): List<ReportAdminView> {
        requireAdmin()
        return reportRepository.findAllPending().map { report ->
            val reporter = userRepository.findById(report.reporterId)
            val reported = userRepository.findById(report.reportedId)
            ReportAdminView(
                id = report.id,
                reporterId = report.reporterId,
                reporterName = reporter?.name,
                targetId = report.reportedId,
                targetName = reported?.name,
                reason = report.reason,
                status = report.status,
                createdAt = report.createdAt?.toString()
            )
        }
    }

    @PostMapping(value = ["/reports/{reportId}/resolve"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun resolveReport(@PathVariable reportId: Long): Map<String, Any> {
        requireAdmin()
        reportRepository.updateStatus(reportId, "RESOLVED")
        log.info("Admin resolved report {}", reportId)
        return mapOf("success" to true, "reportId" to reportId)
    }
}

data class AdminDashboard(
    val totalUsers: Long,
    val verifiedUsers: Long,
    val unverifiedUsers: Long,
    val pendingReports: Int
)

data class ReportAdminView(
    val id: Long?,
    val reporterId: Long?,
    val reporterName: String?,
    val targetId: Long?,
    val targetName: String?,
    val reason: String?,
    val status: String?,
    val createdAt: String?
)
