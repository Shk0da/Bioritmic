package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Bookmark
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = transactionManager)
interface BookmarkRepository : CoroutineCrudRepository<Bookmark, Bookmark.PrimaryKey> {

    @Query("select count(*) from bookmarks where user_id = :userId")
    suspend fun countByUserId(userId: Long): Long

    @Query("select * from bookmarks where user_id = :userId order by timestamp desc limit :limit offset :offset")
    suspend fun findAllByUserId(userId: Long, limit: Int, offset: Long): List<Bookmark>

    @Query("delete from bookmarks where user_id = :userId")
    suspend fun deleteAllByUserId(userId: Long)

    @Query("delete from bookmarks where user_id = :userId and other_user_id = :otherUserId")
    suspend fun deleteByUserIdAndOtherUserId(userId: Long, otherUserId: Long)

    @Modifying
    @Query(
        "insert into bookmarks(user_id, other_user_id, timestamp) " +
            "values (:userId, :otherUserId, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set timestamp = excluded.timestamp"
    )
    suspend fun insert(userId: Long, otherUserId: Long, timestamp: Timestamp?): Int
}
