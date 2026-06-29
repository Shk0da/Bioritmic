package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp
import java.util.UUID

@Table("mailbox_reactions")
class MailboxReaction {
    @Id
    var id: Long? = null

    @Column("mail_id")
    var mailId: Long? = null

    @Column("user_id")
    var userId: UUID? = null

    @Column("reaction")
    var reaction: String? = null

    @Column("reacted_at")
    var reactedAt: Timestamp? = null
}
