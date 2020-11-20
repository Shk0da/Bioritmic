package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.Meeting
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import java.sql.Timestamp
import javax.validation.constraints.NotNull

data class UserMeeting(@field:NotNull val userId: Long?,
                       @field:NotNull val lat: Double?,
                       @field:NotNull val lon: Double?,
                       @field:NotNull val distance: Double?,
                       @JsonProperty(access = JsonProperty.Access.READ_ONLY)
                       var timestamp: Timestamp? = null
) : BasicPresentation {

    companion object {
        fun of(meeting: Meeting): UserMeeting {
            return UserMeeting(
                    userId = meeting.otherUserId,
                    lat = meeting.otherUserLat,
                    lon = meeting.otherUserLon,
                    distance = meeting.distance,
                    timestamp = meeting.timestamp,
            )
        }
    }

    @JsonIgnore
    fun isFilledInput(): Boolean {
        return null != userId && null != lat && null != lon && null != distance
    }
}