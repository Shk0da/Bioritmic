package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.lang.System.currentTimeMillis
import java.sql.Timestamp
import java.util.UUID

@Table(name = "bookmarks")
class Bookmark {

    data class PrimaryKey(var userId: UUID? = null, var otherUserId: UUID? = null) : Serializable {
        companion object {
            private const val serialVersionUID = 1L
        }
    }

    @Column("user_id")
    var userId: UUID? = null

    @Column("other_user_id")
    var otherUserId: UUID? = null

    @Column("timestamp")
    var timestamp: Timestamp? = null

    companion object {
        fun of(userId: UUID, userBookmark: UserBookmark): Bookmark {
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
