package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp
import java.util.UUID

@Table(name = "meetings")
class Meeting : Serializable {

    data class PrimaryKey(var userId: UUID? = null, var otherUserId: UUID? = null) : Serializable {
        companion object {
            private const val serialVersionUID = 1L
        }
    }

    @Column("user_id")
    var userId: UUID? = null

    @Column("other_user_id")
    var otherUserId: UUID? = null

    @Column("other_user_lat")
    var otherUserLat: Double? = null

    @Column("other_user_lon")
    var otherUserLon: Double? = null

    @Column("distance")
    var distance: Double? = null

    @Column("timestamp")
    var timestamp: Timestamp? = null

    @Column("status")
    var status: String? = "PENDING"

    companion object {
        private const val serialVersionUID = 1L

        fun of(userId: UUID, userMeeting: UserMeeting): Meeting {
            val meeting = Meeting()
            meeting.userId = userId
            meeting.otherUserId = userMeeting.userId
            meeting.otherUserLat = userMeeting.lat
            meeting.otherUserLon = userMeeting.lon
            meeting.distance = userMeeting.distance
            meeting.timestamp = Timestamp(System.currentTimeMillis())
            return meeting
        }
    }

    override fun toString(): String {
        return "Meeting(userId=$userId, otherUserId=$otherUserId, " +
            "otherUserLat=$otherUserLat, lotherUserLon=$otherUserLon, " +
            "distance=$distance, timestamp=$timestamp)"
    }
}
