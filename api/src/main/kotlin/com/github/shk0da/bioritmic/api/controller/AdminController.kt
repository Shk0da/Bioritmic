package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_MODERATOR
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_BANNED
import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_USER
import com.github.shk0da.bioritmic.api.domain.UserRole
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.repository.AuthRepository
import com.github.shk0da.bioritmic.api.repository.FeedbackRepository
import com.github.shk0da.bioritmic.api.repository.ReportRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.service.AdminAuditService
import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.BannedWordService
import com.github.shk0da.bioritmic.api.service.DiamondService
import com.github.shk0da.bioritmic.api.service.EmailService
import com.github.shk0da.bioritmic.api.service.FeedbackService
import com.github.shk0da.bioritmic.api.service.ImportMode
import com.github.shk0da.bioritmic.api.service.ProfanityFilterService
import com.github.shk0da.bioritmic.api.service.S3Service
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.ClientIpUtils
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import com.github.shk0da.bioritmic.api.utils.SecurityUtils
import io.micrometer.core.instrument.MeterRegistry
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.http.codec.multipart.FilePart
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ServerWebExchange
import java.lang.management.ManagementFactory
import java.util.UUID

@Suppress("TooManyFunctions")
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/admin")
class AdminController(
    val userRepository: UserRepository,
    val userRoleRepository: UserRoleRepository,
    val authRepository: AuthRepository,
    val reportRepository: ReportRepository,
    val feedbackRepository: FeedbackRepository,
    val feedbackService: FeedbackService,
    val s3Service: S3Service,
    val userService: UserService,
    val emailService: EmailService,
    val meterRegistry: MeterRegistry,
    val adminAuditService: AdminAuditService,
    val bannedWordService: BannedWordService,
    val profanityFilterService: ProfanityFilterService,
    val diamondService: DiamondService,
    private val authService: AuthService,
) {

    private val log = LoggerFactory.getLogger(AdminController::class.java)

    private companion object {
        private const val BYTES_PER_KILOBYTE = 1024
        private const val HOURS_PER_DAY = 24
        private const val MINUTES_PER_HOUR = 60
        private const val SECONDS_PER_MINUTE = 60
    }

    private suspend fun audit(
        adminUserId: UUID,
        action: String,
        exchange: ServerWebExchange,
        targetUserId: UUID? = null,
        details: String? = null
    ) {
        adminAuditService.log(
            adminUserId = adminUserId,
            action = action,
            targetUserId = targetUserId,
            details = details,
            clientIp = ClientIpUtils.fromRequest(exchange.request)
        )
    }

    private fun requireStaffUserId(): UUID {
        val auth = SecurityContextHolder.getContext().authentication
            ?: throw ApiException(ErrorCode.ACCESS_DENIED)
        val authorities = auth.authorities.map { it.authority }
        if (authorities.none { it == ROLE_ADMIN || it == ROLE_MODERATOR }) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        return auth.principal as UUID
    }

    private fun requireAdminUserId(): UUID {
        val auth = SecurityContextHolder.getContext().authentication
            ?: throw ApiException(ErrorCode.ACCESS_DENIED)
        if (auth.authorities.none { it.authority == ROLE_ADMIN }) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        return auth.principal as UUID
    }

    private fun requireStaff() {
        requireStaffUserId()
    }

    private fun requireAdmin() {
        requireAdminUserId()
    }

    private fun normalizeRole(role: String): String {
        val canonical = role.trim().uppercase().removePrefix("ROLE_")
        return when (canonical) {
            "USER" -> ROLE_USER
            "ADMIN" -> ROLE_ADMIN
            "MODERATOR" -> UserRole.ROLE_MODERATOR
            "BANNED" -> ROLE_BANNED
            else -> throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Invalid role: $role"))
        }
    }

    @GetMapping(value = ["/dashboard"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun dashboard(): AdminDashboard {
        requireStaff()
        val totalUsers = userRepository.countAll()
        val verifiedUsers = userRepository.countVerified()
        val unverifiedUsers = userRepository.countUnverified()
        val pendingReports = reportRepository.countAllPending().toInt()
        val newFeedback = feedbackRepository.countNew().toInt()

        return AdminDashboard(
            totalUsers = totalUsers,
            verifiedUsers = verifiedUsers,
            unverifiedUsers = unverifiedUsers,
            pendingReports = pendingReports,
            newFeedback = newFeedback
        )
    }

    @GetMapping(value = ["/users"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listUsers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
        @RequestParam(required = false) search: String?
    ): PaginatedUsersResponse {
        requireStaff()
        val pageSize = size.coerceIn(1, 100)
        val query = search?.trim()?.takeIf { it.isNotEmpty() }
        val pattern = query?.let { "%$it%" }
        val total = if (pattern != null) userRepository.countBySearch(pattern) else userRepository.countAll()
        val users = if (pattern != null) {
            userRepository.findBySearchPaginated(pattern, pageSize, page.toLong() * pageSize)
        } else {
            userRepository.findAllPaginated(pageSize, page.toLong() * pageSize)
        }
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
        val balancesByUser = diamondService.getBalancesByUserIds(userIds)
        val userInfosWithBalances = userInfos.map { info ->
            info.copy(diamondBalance = balancesByUser[info.id] ?: 0L)
        }
        return PaginatedUsersResponse(users = userInfosWithBalances, total = total, page = page, size = pageSize)
    }

    @PostMapping(value = ["/users/{userId}/diamonds"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun setUserDiamondBalance(
        @PathVariable userId: UUID,
        @RequestBody request: AdminDiamondBalanceRequest,
        exchange: ServerWebExchange,
    ): Map<String, Any> {
        val adminUserId = requireAdminUserId()
        val balance = diamondService.setBalanceByAdmin(userId, request.balance, adminUserId)
        audit(adminUserId, "SET_DIAMOND_BALANCE", exchange, userId, details = "balance=$balance")
        return mapOf("success" to true, "userId" to userId, "balance" to balance)
    }

    @Suppress("ComplexCondition", "ThrowsCount")
    @PostMapping(value = ["/users/{userId}/ban"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun banUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        val staffUserId = requireStaffUserId()
        val staffIsAdmin = SecurityContextHolder.getContext().authentication
            ?.authorities
            ?.any { it.authority == ROLE_ADMIN }
            ?: false
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot ban an admin"))
        }
        val targetIsModerator = ROLE_MODERATOR in roles || roles.any {
            it == "MODERATOR" || it == UserRole.ROLE_MODERATOR
        }
        if (!staffIsAdmin && targetIsModerator) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot ban a moderator"))
        }
        userRoleRepository.removeRole(userId, ROLE_USER)
        userRoleRepository.removeRole(userId, "USER")
        userRoleRepository.removeRole(userId, ROLE_BANNED)
        userRoleRepository.removeRole(userId, "BANNED")
        userRoleRepository.addRole(userId, ROLE_BANNED)
        authService.deleteAuthByUserId(userId)
        log.warn("Admin banned user {}", userId)
        audit(staffUserId, "BAN_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/unban"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unbanUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        val adminUserId = requireStaffUserId()
        userRoleRepository.removeRole(userId, ROLE_BANNED)
        userRoleRepository.removeRole(userId, "BANNED")
        userRoleRepository.addRole(userId, ROLE_USER)
        log.info("Admin unbanned user {}", userId)
        audit(adminUserId, "UNBAN_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/verify"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun verifyUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        val adminUserId = requireStaffUserId()
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val wasVerified = user.isVerified
        userRepository.setVerified(userId, true)
        if (!wasVerified) {
            diamondService.grantRegistrationBonus(userId)
        }
        log.info("Admin verified user {} ({})", userId, user.name)
        audit(adminUserId, "VERIFY_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @PostMapping(value = ["/users/{userId}/unverify"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unverifyUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        val adminUserId = requireStaffUserId()
        val user = userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot unverify an admin"))
        }
        userRepository.setVerified(userId, false)
        log.info("Admin unverified user {} ({})", userId, user.name)
        audit(adminUserId, "UNVERIFY_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @Suppress("ThrowsCount")
    @PostMapping(value = ["/users/{userId}/role"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun changeRole(
        @PathVariable userId: UUID,
        @RequestBody body: Map<String, String>,
        exchange: ServerWebExchange
    ): Map<String, Any> {
        val adminUserId = requireAdminUserId()
        val newRole = normalizeRole(
            body["role"] ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Role is required"))
        )

        if (userId == adminUserId) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot change your own role"))
        }

        userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val currentRoles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in currentRoles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot change role of an admin"))
        }

        currentRoles.forEach { role ->
            userRoleRepository.removeRole(userId, role)
        }
        userRoleRepository.addRole(userId, newRole)
        if (newRole == ROLE_BANNED) {
            authService.deleteAuthByUserId(userId)
        }

        log.warn("Admin changed role of user {} from {} to {}", userId, currentRoles.joinToString(","), newRole)
        audit(adminUserId, "CHANGE_ROLE", exchange, userId, "role=$newRole")
        return mapOf("success" to true, "userId" to userId, "role" to newRole)
    }

    @PostMapping(value = ["/users/{userId}/reset-password"], produces = [MediaType.APPLICATION_JSON_VALUE])
    @Suppress("TooGenericExceptionCaught")
    suspend fun resetPassword(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        val adminUserId = requireStaffUserId()
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
        audit(adminUserId, "RESET_PASSWORD", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @DeleteMapping(value = ["/users/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteUser(@PathVariable userId: UUID, exchange: ServerWebExchange): Map<String, Any> {
        val adminUserId = requireAdminUserId()
        val roles = userRoleRepository.findAllByUserId(userId).map { it.role }
        if (ROLE_ADMIN in roles) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot delete an admin"))
        }
        userService.deleteUserById(userId)
        log.warn("Admin deleted user {}", userId)
        audit(adminUserId, "DELETE_USER", exchange, userId)
        return mapOf("success" to true, "userId" to userId)
    }

    @GetMapping(value = ["/reports"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun pendingReports(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int
    ): List<ReportAdminView> {
        requireStaff()
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
                description = report.description,
                status = report.status,
                createdAt = report.createdAt?.toString()
            )
        }
    }

    @PostMapping(value = ["/reports/{reportId}/resolve"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun resolveReport(@PathVariable reportId: Long, exchange: ServerWebExchange): Map<String, Any> {
        val adminUserId = requireStaffUserId()
        reportRepository.updateStatus(reportId, "RESOLVED")
        log.info("Admin resolved report {}", reportId)
        audit(adminUserId, "RESOLVE_REPORT", exchange, details = "reportId=$reportId")
        return mapOf("success" to true, "reportId" to reportId)
    }

    @GetMapping(value = ["/feedback"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listFeedback(
        @RequestParam(required = false) status: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int
    ): PaginatedFeedbackResponse {
        requireStaff()
        val result = feedbackService.listForAdmin(status, page, size)
        val userIds = result.items.map { it.userId }.toSet()
        val usersById = if (userIds.isNotEmpty()) {
            userRepository.findByIdIn(userIds).associateBy { it.id }
        } else {
            emptyMap()
        }
        val items = result.items.map { feedback ->
            FeedbackAdminView(
                id = feedback.id,
                userId = feedback.userId,
                userName = usersById[feedback.userId]?.name,
                userEmail = usersById[feedback.userId]?.email,
                topic = feedback.topic,
                message = feedback.message,
                status = feedback.status,
                attachmentUrl = feedback.attachmentS3Key?.let { s3Service.getPhotoUrl(it) },
                attachmentFilename = feedback.attachmentFilename,
                attachmentContentType = feedback.attachmentContentType,
                createdAt = feedback.createdAt?.toString()
            )
        }
        return PaginatedFeedbackResponse(
            items = items,
            total = result.total,
            page = result.page,
            size = result.size
        )
    }

    @PostMapping(
        value = ["/feedback/{feedbackId}/status"],
        consumes = [MediaType.APPLICATION_JSON_VALUE],
        produces = [MediaType.APPLICATION_JSON_VALUE]
    )
    suspend fun updateFeedbackStatus(
        @PathVariable feedbackId: Long,
        @RequestBody body: Map<String, String>,
        exchange: ServerWebExchange
    ): Map<String, Any> {
        val adminUserId = requireStaffUserId()
        val status = body["status"]
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Status is required"))
        feedbackService.updateStatus(feedbackId, status)
        log.info("Admin updated feedback {} status to {}", feedbackId, status)
        audit(adminUserId, "UPDATE_FEEDBACK_STATUS", exchange, details = "feedbackId=$feedbackId,status=$status")
        return mapOf("success" to true, "feedbackId" to feedbackId, "status" to status)
    }

    @DeleteMapping(value = ["/feedback/{feedbackId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteFeedback(@PathVariable feedbackId: Long, exchange: ServerWebExchange): Map<String, Any> {
        val adminUserId = requireStaffUserId()
        feedbackService.deleteFeedback(feedbackId)
        log.info("Admin deleted feedback {}", feedbackId)
        audit(adminUserId, "DELETE_FEEDBACK", exchange, details = "feedbackId=$feedbackId")
        return mapOf("success" to true, "feedbackId" to feedbackId)
    }

    @GetMapping(value = ["/metrics"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun metrics(): SystemMetrics {
        requireStaff()
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

    @Suppress("TooGenericExceptionCaught")
    private fun getMeterValue(name: String): Long {
        return try {
            meterRegistry.get(name).gauge().value().toLong()
        } catch (e: Exception) {
            log.error("Failed to get meter value for {}: {}", name, e.message, e)
            0L
        }
    }

    @Suppress("ReturnCount")
    private fun formatBytes(bytes: Long): String {
        if (bytes < BYTES_PER_KILOBYTE) return "$bytes B"
        val kb = bytes / BYTES_PER_KILOBYTE.toDouble()
        if (kb < BYTES_PER_KILOBYTE) return "%.1f KB".format(kb)
        val mb = kb / BYTES_PER_KILOBYTE.toDouble()
        if (mb < BYTES_PER_KILOBYTE) return "%.1f MB".format(mb)
        val gb = mb / BYTES_PER_KILOBYTE.toDouble()
        return "%.2f GB".format(gb)
    }

    @GetMapping("/banned-words", produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun listBannedWords(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") size: Int,
        @RequestParam(required = false) search: String?,
    ): Map<String, Any?> {
        requireStaffUserId()
        val result = bannedWordService.listWords(search, page, size)
        return mapOf(
            "items" to result.items,
            "total" to result.total,
            "page" to result.page,
            "size" to result.size,
        )
    }

    @PostMapping("/banned-words", produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun addBannedWord(
        @RequestBody body: Map<String, String>,
        exchange: ServerWebExchange,
    ): Map<String, Any?> {
        val adminId = requireStaffUserId()
        val word = body["word"]?.trim().orEmpty()
        if (word.isEmpty()) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("word" to "word"))
        }
        val saved = bannedWordService.addWord(word)
        profanityFilterService.refreshCache()
        audit(adminId, "BANNED_WORD_ADD", exchange, details = saved.word)
        return mapOf("item" to saved)
    }

    @DeleteMapping("/banned-words/{id}", produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteBannedWord(
        @PathVariable id: Long,
        exchange: ServerWebExchange,
    ): Map<String, Boolean> {
        val adminId = requireStaffUserId()
        bannedWordService.deleteWord(id)
        profanityFilterService.refreshCache()
        audit(adminId, "BANNED_WORD_DELETE", exchange, details = id.toString())
        return mapOf("success" to true)
    }

    @PostMapping(
        value = ["/banned-words/import"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
        produces = [MediaType.APPLICATION_JSON_VALUE],
    )
    suspend fun importBannedWords(
        @RequestPart("file") file: FilePart,
        @RequestParam(defaultValue = "append") mode: String,
        exchange: ServerWebExchange,
    ): Map<String, Any?> {
        val adminId = requireStaffUserId()
        val importMode = when (mode.lowercase()) {
            "replace" -> ImportMode.REPLACE
            "append" -> ImportMode.APPEND
            else -> throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("mode" to "mode"))
        }
        val result = bannedWordService.importFromFile(file, importMode)
        profanityFilterService.refreshCache()
        audit(
            adminId,
            "BANNED_WORDS_IMPORT",
            exchange,
            details = "mode=${result.mode}, added=${result.added}, skipped=${result.skipped}",
        )
        return mapOf(
            "added" to result.added,
            "skipped" to result.skipped,
            "total" to result.total,
            "mode" to result.mode,
        )
    }

    private fun formatDuration(ms: Long): String {
        val seconds = ms / 1000
        val minutes = seconds / SECONDS_PER_MINUTE
        val hours = minutes / MINUTES_PER_HOUR
        val days = hours / HOURS_PER_DAY
        return when {
            days > 0 -> "${days}d ${hours % HOURS_PER_DAY}h ${minutes % MINUTES_PER_HOUR}m"
            hours > 0 -> "${hours}h ${minutes % MINUTES_PER_HOUR}m"
            minutes > 0 -> "${minutes}m ${seconds % SECONDS_PER_MINUTE}s"
            else -> "${seconds}s"
        }
    }
}

data class AdminDashboard(
    val totalUsers: Long,
    val verifiedUsers: Long,
    val unverifiedUsers: Long,
    val pendingReports: Int,
    val newFeedback: Int = 0
)

data class FeedbackAdminView(
    val id: Long?,
    val userId: UUID?,
    val userName: String?,
    val userEmail: String?,
    val topic: String?,
    val message: String?,
    val status: String?,
    val attachmentUrl: String?,
    val attachmentFilename: String?,
    val attachmentContentType: String?,
    val createdAt: String?
)

data class PaginatedFeedbackResponse(
    val items: List<FeedbackAdminView>,
    val total: Long,
    val page: Int,
    val size: Int
)

data class ReportAdminView(
    val id: Long?,
    val reporterId: UUID?,
    val reporterName: String?,
    val targetId: UUID?,
    val targetName: String?,
    val reason: String?,
    val description: String?,
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

data class AdminDiamondBalanceRequest(
    val balance: Long,
)
