package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.AdminAuditLog
import com.github.shk0da.bioritmic.api.repository.AdminAuditLogRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Service
class AdminAuditService(
    private val adminAuditLogRepository: AdminAuditLogRepository
) {

    @Transactional
    suspend fun log(
        adminUserId: UUID,
        action: String,
        targetUserId: UUID? = null,
        details: String? = null,
        clientIp: String? = null
    ) {
        val entry = AdminAuditLog().apply {
            this.adminUserId = adminUserId
            this.action = action
            this.targetUserId = targetUserId
            this.details = details
            this.clientIp = clientIp
            this.createdAt = Timestamp(System.currentTimeMillis())
        }
        adminAuditLogRepository.save(entry)
    }
}
