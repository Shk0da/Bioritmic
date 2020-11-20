package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import java.io.Serializable
import java.lang.System.currentTimeMillis
import java.sql.Timestamp
import javax.persistence.*

@Entity
@IdClass(Bookmark.PrimaryKey::class)
@Table(name = "bookmarks")
@org.springframework.data.relational.core.mapping.Table("bookmarks")
class Bookmark {

    data class PrimaryKey(var userId: Long? = null, var otherUserId: Long? = null) : Serializable

    @Id
    @Column(name = "user_id")
    @org.springframework.data.relational.core.mapping.Column("user_id")
    var userId: Long? = null

    @Id
    @Column(name = "other_user_id")
    @org.springframework.data.relational.core.mapping.Column("other_user_id")
    var otherUserId: Long? = null

    @Column(name = "timestamp")
    @org.springframework.data.relational.core.mapping.Column("timestamp")
    var timestamp: Timestamp? = null

    companion object {
        fun of(userId: Long, userBookmark: UserBookmark): Bookmark {
            val bookmark = Bookmark()
            bookmark.userId = userId
            bookmark.otherUserId = userBookmark.userId
            bookmark.timestamp = Timestamp(currentTimeMillis())
            return bookmark
        }
    }

    override fun toString(): String {
        return "Bookmark(userId=$userId, bookmarkUserId=$otherUserId, timestamp=$timestamp)"
    }
}
