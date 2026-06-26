package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_BANNED
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_USER
import com.github.shk0da.bioritmic.api.domain.UserRole
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.repository.AuthRepository
import com.github.shk0da.bioritmic.api.repository.ReportRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.service.AdminAuditService
import com.github.shk0da.bioritmic.api.service.EmailService
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.ClientIpUtils
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ServerWebExchange
import java.lang.management.ManagementFactory
import java.util.UUID

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/admin")
class AdminController(
    val userRepository: UserRepository,
    val userRoleRepository: UserRoleRepository,
    val authRepository: AuthRepository,
    val reportRepository: ReportRepository,
    val userService: UserService,
    val emailService: EmailService,
    val meterRegistry: MeterRegistry,
    val adminAuditService: AdminAuditService
) {

    private val log = LoggerFactory.getLogger(AdminController::class.java)

    private suspend fun audit(
        action: String,
        exchange: ServerWebExchange,
        targetUserId: UUID? = null,
        details: String? = null
    ) {
        adminAuditService.log(
            adminUserId = getUserId(),
            action = action,
            targetUserId = targetUserId,
            details = details,
            clientIp = ClientIpUtils.fromRequest(exchange.request)
        )
    }

    private fun requireAdmin() {
        val auth = SecurityContextHolder.getContext().authentication
        if (auth == null || auth.authorities.none { it.authority == ROLE_ADMIN }) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
    }

    @GetMapping(value = ["/dashboard"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun dashboard(): AdminDashboard {
        requireAdmin()
        val totalUsers = userRepository.countAll()
        val verifiedUsers = userRepository.countVerified()
        val unverifiedUsers = userRepository.countUnverified()
        val pendingReports = reportRepository.countAllPending().toInt()

        return AdminDashboard(
            totalUsers = totalUsers,
            verifiedUsers = verifiedUsers,
            unverifiedUsers = unverifiedUsers,
            pendingReports = pendingReports
        )
    }

    @GetMapping(value = ["/users"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listUsers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int
    ): PaginatedUsersResponse {
        requireAdmin()
        val pageSize = size.coerceIn(1, 100)
        val total = userRepository.countAll()
        val users = userRepository.findAllPaginated(pageSize, page.toLong() * pageSize)
        val userIds = users.mapNotNull { it.id }.toSet()
        val rolesByUser = if (userIds.isNotEmpty()) {
            userRoleRepository.findAllByUserIds(userIds).groupBy({ it.userId }, { it.role })
        } else {
            emptyMap()
        }
        val userInfos = users.map { user ->
            val roles = rolesByUser[user.id]?.joinToString(",") ?: ROLE_USER
            UserInfo.adminSummary(user).copy(role = roles)
        }
        return PaginatedUsersResponse(users = userInfos, total = total, page = page, size = pageSize)
    }

    @PostMapping(value = ["/users/{userId}/ban"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun banUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        requireAdmin()
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot ban an admin"))
        }
        userRoleRepository.removeRole(userId, ROLE_USER)
        userRoleRepository.removeRole(userId, "USER")
        userRoleRepository.addRole(userId, ROLE_BANNED)
        userRoleRepository.addRole(userId, "BANNED")
        log.warn("Admin banned user {}", userId)
        audit("BAN_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/unban"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unbanUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        requireAdmin()
        userRoleRepository.removeRole(userId, ROLE_BANNED)
        userRoleRepository.removeRole(userId, "BANNED")
        userRoleRepository.addRole(userId, ROLE_USER)
        userRoleRepository.addRole(userId, "USER")
        log.info("Admin unbanned user {}", userId)
        audit("UNBAN_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/verify"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun verifyUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        requireAdmin()
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        userRepository.setVerified(userId, true)
        log.info("Admin verified user {} ({})", userId, user.name)
        audit("VERIFY_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/unverify"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unverifyUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        requireAdmin()
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot unverify an admin"))
        }
        userRepository.setVerified(userId, false)
        log.info("Admin unverified user {} ({})", userId, user.name)
        audit("UNVERIFY_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/role"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun changeRole(
        @PathVariable userId: UUID,
        @RequestBody body: Map<String, String>,
        exchange: ServerWebExchange
    ): Map<String, Any> {
        requireAdmin()
        val newRole = body["role"] ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Role is required"))
        val validRoles = setOf(ROLE_USER, ROLE_ADMIN, UserRole.ROLE_MODERATOR, ROLE_BANNED)
        if (newRole !in validRoles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Invalid role: $newRole"))
        }

        val currentUserId = getUserId()
        if (userId == currentUserId) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot change your own role"))
        }

        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val currentRoles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in currentRoles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot change role of an admin"))
        }

        currentRoles.forEach { role ->
            userRoleRepository.removeRole(userId, role)
        }
        userRoleRepository.addRole(userId, newRole)

        log.warn("Admin changed role of user {} from {} to {}", userId, currentRoles.joinToString(","), newRole)
        audit("CHANGE_ROLE", exchange, userId, "role=$newRole")
        return mapOf("success" to true, "userId" to userId, "role" to newRole)
    }

    @PostMapping(value = ["/users/{userId}/reset-password"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun resetPassword(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        requireAdmin()
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)

        val newPassword = SecurityUtils.generateRandomPassword(12)
        user.password = passwordEncoder.encode(newPassword)
        userRepository.save(user)

        authRepository.deleteByUserId(userId)

        try {
            emailService.sendNewPassword(user.email!!, newPassword)
        } catch (e: Exception) {
            log.error("Failed to send new password email to {}: {}", user.email, e.message)
        }

        log.warn("Admin reset password for user {}", userId)
        audit("RESET_PASSWORD", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @DeleteMapping(value = ["/users/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        requireAdmin()
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot delete an admin"))
        }
        userService.deleteUserById(userId)
        log.warn("Admin deleted user {}", userId)
        audit("DELETE_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @GetMapping(value = ["/reports"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun pendingReports(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int
    ): List<ReportAdminView> {
        requireAdmin()
        val pageSize = size.coerceIn(1, 100)
        val pending = reportRepository.findPendingPaginated(pageSize, page.toLong() * pageSize)
        val userIds = pending.flatMap { listOf(it.reporterId, it.reportedId) }.toSet()
        val usersByName = if (userIds.isNotEmpty()) {
            userRepository.findByIdIn(userIds).associateBy { it.id }
        } else {
            emptyMap()
        }
        return pending.map { report ->
            ReportAdminView(
                id = report.id,
                reporterId = report.reporterId,
                reporterName = usersByName[report.reporterId]?.name,
                targetId = report.reportedId,
                targetName = usersByName[report.reportedId]?.name,
                reason = report.reason,
                status = report.status,
                createdAt = report.createdAt?.toString()
            )
        }
    }

    @PostMapping(value = ["/reports/{reportId}/resolve"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun resolveReport(@PathVariable reportId: Long, exchange: ServerWebExchange): Map<String, Any> {
        requireAdmin()
        reportRepository.updateStatus(reportId, "RESOLVED")
        log.info("Admin resolved report {}", reportId)
        audit("RESOLVE_REPORT", exchange, details = "reportId=$reportId")
        return mapOf("success" to true, "reportId" to reportId)
    }

    @GetMapping(value = ["/metrics"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun metrics(): SystemMetrics {
        requireAdmin()
        val runtime = Runtime.getRuntime()
        val memoryBean = ManagementFactory.getMemoryMXBean()
        val runtimeBean = ManagementFactory.getRuntimeMXBean()
        val threadBean = ManagementFactory.getThreadMXBean()

        val heapUsed = runtime.totalMemory() - runtime.freeMemory()
        val heapMax = runtime.maxMemory()
        val nonHeapUsed = memoryBean.nonHeapMemoryUsage.used

        val upTimeMs = runtimeBean.uptime
        val upTimeStr = formatDuration(upTimeMs)

        val cpuCores = runtime.availableProcessors()
        val threadCount = threadBean.threadCount
        val peakThreadCount = threadBean.peakThreadCount

        val dbPoolActive = getMeterValue("r2dbc.pool.active.connections")
        val dbPoolIdle = getMeterValue("r2dbc.pool.idle.connections")
        val dbPoolPending = getMeterValue("r2dbc.pool.pending.connections")

        return SystemMetrics(
            jvm = JvmMetrics(
                version = System.getProperty("java.vm.name") + " " + System.getProperty("java.vm.version"),
                uptime = upTimeStr,
                cpuCores = cpuCores,
                heapUsed = formatBytes(heapUsed),
                heapMax = formatBytes(heapMax),
                heapUsedPercent = if (heapMax > 0) (heapUsed * 100.0 / heapMax) else 0.0,
                nonHeapUsed = formatBytes(nonHeapUsed),
                threadCount = threadCount,
                peakThreadCount = peakThreadCount
            ),
            database = DatabaseMetrics(
                poolActive = dbPoolActive,
                poolIdle = dbPoolIdle,
                poolPending = dbPoolPending
            ),
            system = SystemInfo(
                osName = System.getProperty("os.name"),
                osVersion = System.getProperty("os.version"),
                availableMemory = formatBytes(runtime.maxMemory()),
                totalMemory = formatBytes(runtime.totalMemory()),
                freeMemory = formatBytes(runtime.freeMemory())
            )
        )
    }

    private fun getMeterValue(name: String): Long {
        return try {
            meterRegistry.get(name).gauge().value().toLong()
        } catch (e: Exception) {
            0L
        }
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes < 1024) return "$bytes B"
        val kb = bytes / 1024.0
        if (kb < 1024) return "%.1f KB".format(kb)
        val mb = kb / 1024.0
        if (mb < 1024) return "%.1f MB".format(mb)
        val gb = mb / 1024.0
        return "%.2f GB".format(gb)
    }

    private fun formatDuration(ms: Long): String {
        val seconds = ms / 1000
        val minutes = seconds / 60
        val hours = minutes / 60
        val days = hours / 24
        return when {
            days > 0 -> "${days}d ${hours % 24}h ${minutes % 60}m"
            hours > 0 -> "${hours}h ${minutes % 60}m"
            minutes > 0 -> "${minutes}m ${seconds % 60}s"
            else -> "${seconds}s"
        }
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
    val reporterId: UUID?,
    val reporterName: String?,
    val targetId: UUID?,
    val targetName: String?,
    val reason: String?,
    val status: String?,
    val createdAt: String?
)

data class SystemMetrics(
    val jvm: JvmMetrics,
    val database: DatabaseMetrics,
    val system: SystemInfo
)

data class JvmMetrics(
    val version: String,
    val uptime: String,
    val cpuCores: Int,
    val heapUsed: String,
    val heapMax: String,
    val heapUsedPercent: Double,
    val nonHeapUsed: String,
    val threadCount: Int,
    val peakThreadCount: Int
)

data class DatabaseMetrics(
    val poolActive: Long,
    val poolIdle: Long,
    val poolPending: Long
)

data class SystemInfo(
    val osName: String?,
    val osVersion: String?,
    val availableMemory: String,
    val totalMemory: String,
    val freeMemory: String
)

data class PaginatedUsersResponse(
    val users: List<UserInfo>,
    val total: Long,
    val page: Int,
    val size: Int
)
