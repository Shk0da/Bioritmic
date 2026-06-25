package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.Meeting
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import java.sql.Timestamp
import java.util.UUID
import javax.validation.constraints.NotNull

data class UserMeeting(
    @field:NotNull val userId: UUID?,
    @field:NotNull val lat: Double?,
    @field:NotNull val lon: Double?,
    @field:NotNull val distance: Double?,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    var timestamp: Timestamp? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    var status: String? = null,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    var senderName: String? = null
) : BasicPresentation {

    companion object {
        fun of(meeting: Meeting, currentUserId: UUID? = null): UserMeeting {
            val isCurrentUserCreator = currentUserId == meeting.userId
            val otherUserId = when (currentUserId) {
                meeting.userId -> meeting.otherUserId
                meeting.otherUserId -> meeting.userId
                else -> meeting.otherUserId
            }
            val lat = if (isCurrentUserCreator) meeting.otherUserLat else null
            val lon = if (isCurrentUserCreator) meeting.otherUserLon else null
            return UserMeeting(
                userId = otherUserId,
                lat = lat,
                lon = lon,
                distance = meeting.distance,
                timestamp = meeting.timestamp,
                status = meeting.status,
            )
        }
    }

    @JsonIgnore
    fun isFilledInput(): Boolean {
        return null != userId && null != lat && null != lon && null != distance
    }
}
