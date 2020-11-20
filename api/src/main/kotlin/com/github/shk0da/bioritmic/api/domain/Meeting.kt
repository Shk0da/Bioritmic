package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import java.io.Serializable
import java.sql.Timestamp
import javax.persistence.*

@Entity
@IdClass(Meeting.PrimaryKey::class)
@Table(name = "meetings")
@org.springframework.data.relational.core.mapping.Table("meetings")
class Meeting : Serializable {

    data class PrimaryKey(var userId: Long? = null, var otherUserId: Long? = null) : Serializable

    @Id
    @Column(name = "user_id")
    @org.springframework.data.relational.core.mapping.Column("user_id")
    var userId: Long? = null

    @Id
    @Column(name = "other_user_id")
    @org.springframework.data.relational.core.mapping.Column("other_user_id")
    var otherUserId: Long? = null

    @Column(name = "other_user_lat")
    @org.springframework.data.relational.core.mapping.Column("other_user_lat")
    var otherUserLat: Double? = null

    @Column(name = "other_user_lon")
    @org.springframework.data.relational.core.mapping.Column("other_user_lat")
    var otherUserLon: Double? = null

    @Column(name = "distance")
    @org.springframework.data.relational.core.mapping.Column("distance")
    var distance: Double? = null

    @Column(name = "timestamp")
    @org.springframework.data.relational.core.mapping.Column("timestamp")
    var timestamp: Timestamp? = null

    companion object {
        fun of(userId: Long, userMeeting: UserMeeting): Meeting {
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
        return "Meeting(userId=$userId, otherUserId=$otherUserId, otherUserLat=$otherUserLat, lotherUserLon=$otherUserLon, distance=$distance, timestamp=$timestamp)"
    }
}
