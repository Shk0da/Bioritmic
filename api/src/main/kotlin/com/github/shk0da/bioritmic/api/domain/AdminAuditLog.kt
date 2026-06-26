package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp
import java.util.UUID

@Table(name = "admin_audit_log")
class AdminAuditLog {

    @Id
    var id: Long? = null

    @Column("admin_user_id")
    var adminUserId: UUID? = null

    @Column("action")
    var action: String? = null

    @Column("target_user_id")
    var targetUserId: UUID? = null

    @Column("details")
    var details: String? = null

    @Column("client_ip")
    var clientIp: String? = null

    @Column("created_at")
    var createdAt: Timestamp? = null
}
