package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.Bookmark
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = jpaTransactionManager)
interface BookmarkJpaRepository : JpaRepository<Bookmark, Bookmark.PrimaryKey> {

    @Query("select count(*) from bookmarks where user_id = :userId", nativeQuery = true)
    fun countByUserId(userId: Long): Long

    @Query("select * from bookmarks where user_id = :userId order by timestamp desc limit :limit offset :offset", nativeQuery = true)
    fun findAllByUserId(userId: Long, limit: Int, offset: Long): List<Bookmark>

    @Query("delete from bookmarks where user_id = :userId", nativeQuery = true)
    fun deleteAllByUserId(userId: Long)

    @Query("delete from bookmarks where user_id = :userId and other_user_id = :otherUserId", nativeQuery = true)
    fun deleteByUserIdAndOtherUserId(userId: Long, otherUserId: Long)

    @Modifying
    @Query(
        "insert into bookmarks(user_id, other_user_id, timestamp) " +
            "values (:userId, :otherUserId, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set timestamp = excluded.timestamp", nativeQuery = true
    )
    fun insert(userId: Long, otherUserId: Long, timestamp: Timestamp?): Int
}
