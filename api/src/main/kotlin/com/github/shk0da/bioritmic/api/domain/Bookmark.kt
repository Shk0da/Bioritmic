package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import java.lang.System.currentTimeMillis
import java.sql.Timestamp
import javax.persistence.*

@Entity
@Table(name = "bookmarks")
@org.springframework.data.relational.core.mapping.Table("bookmarks")
class Bookmark {

    @Id
    @org.springframework.data.annotation.Id
    @org.springframework.data.relational.core.mapping.Column("id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "user_id")
    @org.springframework.data.relational.core.mapping.Column("user_id")
    var userId: Long? = null

    @Column(name = "bookmark_user_id")
    @org.springframework.data.relational.core.mapping.Column("bookmark_user_id")
    var bookmarkUserId: Long? = null

    @Column(name = "timestamp")
    @org.springframework.data.relational.core.mapping.Column("timestamp")
    var timestamp: Timestamp? = null

    companion object {
        fun of(userId: Long, userBookmark: UserBookmark): Bookmark {
            val bookmark = Bookmark()
            bookmark.userId = userId
            bookmark.bookmarkUserId = userBookmark.userId
            bookmark.timestamp = Timestamp(currentTimeMillis())
            return bookmark
        }
    }

    override fun toString(): String {
        return "Bookmark(id=$id, userId=$userId, bookmarkUserId=$bookmarkUserId, timestamp=$timestamp)"
    }
}
