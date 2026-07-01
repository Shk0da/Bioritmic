package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table("diamond_transactions")
class DiamondTransaction : Serializable {
    @Id
    var id: Long? = null

    @Column("from_user_id")
    var fromUserId: UUID? = null

    @Column("to_user_id")
    var toUserId: UUID? = null

    @Column("amount")
    var amount: Long = 0

    @Column("type")
    var type: String = ""

    @Column("description")
    var description: String? = null

    @Column("created_at")
    var createdAt: Timestamp? = null
}

object DiamondTransactionType {
    const val TRANSFER = "TRANSFER"
    const val ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT"
    const val PURCHASE = "PURCHASE"
    const val REGISTRATION_BONUS = "REGISTRATION_BONUS"
    const val BOOST_PURCHASE = "BOOST_PURCHASE"
}
