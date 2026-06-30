package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp
import java.util.UUID

@Table("swipe_skips")
class SwipeSkip {

    @Id
    var primaryKey: PrimaryKey? = null

    @Column("timestamp")
    var timestamp: Timestamp? = null

    data class PrimaryKey(
        @Column("user_id")
        val userId: UUID,
        @Column("other_user_id")
        val otherUserId: UUID,
    )
}
