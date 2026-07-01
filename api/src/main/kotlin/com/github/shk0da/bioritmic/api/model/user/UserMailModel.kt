package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.model.mailbox.MailReactionType
import com.github.shk0da.bioritmic.api.model.mailbox.MailMediaType
import com.github.shk0da.bioritmic.api.model.mailbox.DiamondMailMessage
import com.github.shk0da.bioritmic.api.model.mailbox.MailSystemMessage
import java.sql.Timestamp
import java.util.UUID
import javax.validation.constraints.NotNull
import javax.validation.constraints.Size

data class UserMailModel(
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val id: Long? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) var from: UUID? = null,
    @field:NotNull val to: UUID? = null,
    @field:Size(max = 1024) val message: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) var timestamp: Timestamp? = null,
    val replyToMessageId: Long? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val replyTargetUnavailable: Boolean? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val mediaType: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val mediaUrl: String? = null,
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) val mediaS3Key: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val currentUserReaction: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val reactionCounts: Map<String, Int>? = null,
    @get:JsonProperty("isRead")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val messageRead: Boolean? = null,
    @get:JsonProperty("isSystem")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    val systemMessage: Boolean? = null
) {

    companion object {
        fun of(
            userMail: UserMail,
            mediaUrl: String? = null,
            currentUserReaction: String? = null,
            reactionCounts: Map<String, Int> = emptyMap()
        ): UserMailModel {
            val displayMessage = userMail.message?.takeIf { it.isNotBlank() }
                ?: previewMessage(userMail.mediaType)
            val validCounts = reactionCounts
                .filterKeys { MailReactionType.parse(it) != null }
                .filterValues { it > 0 }
            return UserMailModel(
                id = userMail.id,
                from = userMail.fromUserId,
                to = userMail.toUserId!!,
                message = displayMessage,
                timestamp = userMail.timestamp,
                replyToMessageId = userMail.replyToMessageId,
                replyTargetUnavailable = userMail.replyTargetUnavailable.takeIf { it },
                mediaType = userMail.mediaType,
                mediaUrl = mediaUrl,
                currentUserReaction = currentUserReaction,
                reactionCounts = validCounts,
                messageRead = userMail.isRead,
                systemMessage = MailSystemMessage.isSystem(userMail) || DiamondMailMessage.isDiamond(userMail)
            )
        }

        private fun previewMessage(mediaType: String?): String = when (mediaType) {
            MailMediaType.VOICE.name -> "Голосовое сообщение"
            MailMediaType.PHOTO.name -> "Фото"
            MailMediaType.VIDEO_NOTE.name -> "Видео-кружок"
            MailMediaType.DIAMOND.name -> "Алмазы"
            else -> ""
        }
    }
}
