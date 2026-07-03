package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table("diamond_wallets")
class DiamondWallet : Serializable {
    companion object {
        private const val serialVersionUID = 1L
    }

    @Id
    @Column("user_id")
    var userId: UUID? = null

    @Column("balance")
    var balance: Long = 0

    @Column("updated_at")
    var updatedAt: Timestamp? = null
}
