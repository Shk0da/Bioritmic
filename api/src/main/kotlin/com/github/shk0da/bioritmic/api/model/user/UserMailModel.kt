package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.model.mailbox.MailMediaType
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
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val mediaType: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val mediaUrl: String? = null,
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) val mediaS3Key: String? = null
) {

    companion object {
        fun of(userMail: UserMail, mediaUrl: String? = null): UserMailModel {
            val displayMessage = userMail.message?.takeIf { it.isNotBlank() }
                ?: previewMessage(userMail.mediaType)
            return UserMailModel(
                id = userMail.id,
                from = userMail.fromUserId,
                to = userMail.toUserId!!,
                message = displayMessage,
                timestamp = userMail.timestamp,
                mediaType = userMail.mediaType,
                mediaUrl = mediaUrl
            )
        }

        private fun previewMessage(mediaType: String?): String = when (mediaType) {
            MailMediaType.VOICE.name -> "Голосовое сообщение"
            MailMediaType.PHOTO.name -> "Фото"
            MailMediaType.VIDEO_NOTE.name -> "Видео-кружок"
            else -> ""
        }
    }
}
