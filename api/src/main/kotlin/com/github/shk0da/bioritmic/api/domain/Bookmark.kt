package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.lang.System.currentTimeMillis
import java.sql.Timestamp

@Table(name = "bookmarks")
class Bookmark {

    data class PrimaryKey(var userId: Long? = null, var otherUserId: Long? = null) : Serializable

    @Column("user_id")
    var userId: Long? = null

    @Column("other_user_id")
    var otherUserId: Long? = null

    @Column("timestamp")
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
