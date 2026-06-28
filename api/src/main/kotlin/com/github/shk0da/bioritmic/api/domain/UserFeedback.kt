package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table(name = "user_feedback")
class UserFeedback : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: UUID = UUID.randomUUID()

    @Column("topic")
    var topic: String = ""

    @Column("message")
    var message: String = ""

    @Column("attachment_s3_key")
    var attachmentS3Key: String? = null

    @Column("attachment_filename")
    var attachmentFilename: String? = null

    @Column("attachment_content_type")
    var attachmentContentType: String? = null

    @Column("status")
    var status: String = FeedbackStatus.NEW

    @Column("created_at")
    var createdAt: Timestamp? = null

    companion object {
        private const val serialVersionUID = 1L
    }
}

object FeedbackStatus {
    const val NEW = "NEW"
    const val PROCESSED = "PROCESSED"
    const val TRASH = "TRASH"

    val ALL = setOf(NEW, PROCESSED, TRASH)
}

object FeedbackTopic {
    const val BUG = "BUG"
    const val SUGGESTION = "SUGGESTION"
    const val ACCOUNT = "ACCOUNT"
    const val OTHER = "OTHER"

    val ALL = setOf(BUG, SUGGESTION, ACCOUNT, OTHER)
}
