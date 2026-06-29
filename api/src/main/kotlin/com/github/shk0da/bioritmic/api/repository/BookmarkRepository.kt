package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Bookmark
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface BookmarkRepository : CoroutineCrudRepository<Bookmark, Bookmark.PrimaryKey> {

    @Query("select count(*) from bookmarks where user_id = :userId")
    suspend fun countByUserId(userId: UUID): Long

    @Query("select * from bookmarks where user_id = :userId order by timestamp desc limit :limit offset :offset")
    suspend fun findAllByUserId(userId: UUID, limit: Int, offset: Long): List<Bookmark>

    @Query("delete from bookmarks where user_id = :userId")
    suspend fun deleteAllByUserId(userId: UUID)

    @Query("delete from bookmarks where user_id = :userId and other_user_id = :otherUserId")
    suspend fun deleteByUserIdAndOtherUserId(userId: UUID, otherUserId: UUID)

    @Modifying
    @Query(
        "insert into bookmarks(user_id, other_user_id, timestamp) " +
            "values (:userId, :otherUserId, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set timestamp = excluded.timestamp"
    )
    suspend fun insert(userId: UUID, otherUserId: UUID, timestamp: Timestamp?): Int

    @Query(
        "SELECT b1.other_user_id FROM bookmarks b1 " +
            "JOIN bookmarks b2 ON b1.other_user_id = b2.user_id AND b2.other_user_id = b1.user_id " +
            "WHERE b1.user_id = :userId"
    )
    suspend fun findMutualBookmarkUserIds(userId: UUID): List<UUID>

    @Query(
        "SELECT COUNT(*) FROM bookmarks b1 " +
            "JOIN bookmarks b2 ON b1.other_user_id = b2.user_id AND b2.other_user_id = b1.user_id " +
            "WHERE b1.user_id = :userId"
    )
    suspend fun countMutualBookmarks(userId: UUID): Long

    @Query("SELECT EXISTS(SELECT 1 FROM bookmarks WHERE user_id = :userId AND other_user_id = :otherUserId)")
    suspend fun existsByUserIdAndOtherUserId(userId: UUID, otherUserId: UUID): Boolean
}
