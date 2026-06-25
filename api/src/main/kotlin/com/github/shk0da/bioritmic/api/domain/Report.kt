package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table(name = "reports")
class Report : Serializable {

    @Id
    var id: Long? = null

    @Column("reporter_id")
    var reporterId: UUID = UUID.randomUUID()

    @Column("reported_id")
    var reportedId: UUID = UUID.randomUUID()

    @Column("reason")
    var reason: String = ""

    @Column("description")
    var description: String? = null

    @Column("status")
    var status: String = "PENDING"

    @Column("created_at")
    var createdAt: Timestamp? = null

    companion object {
        private const val serialVersionUID = 1L
    }
}
