package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp

@Table(name = "subscriptions")
class Subscription : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: Long = 0

    @Column("plan")
    var plan: String = PLAN_FREE

    @Column("status")
    var status: String = STATUS_ACTIVE

    @Column("expires_at")
    var expiresAt: Timestamp? = null

    @Column("created_at")
    var createdAt: Timestamp? = null

    companion object {
        private const val serialVersionUID = 1L

        const val PLAN_FREE = "FREE"
        const val PLAN_PRO = "PRO"
        const val STATUS_ACTIVE = "ACTIVE"
        const val STATUS_CANCELLED = "CANCELLED"
    }
}
