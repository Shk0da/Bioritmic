package com.github.shk0da.bioritmic.api.repository


import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.Meeting
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = jpaTransactionManager)
interface MeetingsJpaRepository : JpaRepository<Meeting, Meeting.PrimaryKey> {

    @Query("select count(*) from meetings where user_id = :userId", nativeQuery = true)
    fun countByUserId(userId: Long): Long

    @Query("select * from meetings where user_id = :userId order by timestamp desc limit :limit offset :offset", nativeQuery = true)
    fun findAllByUserId(userId: Long, limit: Int, offset: Long): List<Meeting>

    @Query("delete from meetings where user_id = :userId", nativeQuery = true)
    fun deleteAllByUserId(userId: Long)

    @Query("delete from meetings where user_id = :userId and other_user_id = :otherUserId", nativeQuery = true)
    fun deleteByUserIdAndOtherUserId(userId: Long, otherUserId: Long)

    @Modifying
    @Query(
        "insert into meetings(user_id, other_user_id, other_user_lat, other_user_lon, distance, timestamp) " +
            "values (:userId, :otherUserId, :otherUserLat, :otherUserLon, :distance, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set other_user_lat = excluded.other_user_lat, other_user_lon = excluded.other_user_lon, " +
            "distance = excluded.distance, timestamp = excluded.timestamp", nativeQuery = true
    )
    fun insert(
        userId: Long,
        otherUserId: Long,
        otherUserLat: Double?,
        otherUserLon: Double?,
        distance: Double?,
        timestamp: Timestamp?
    ): Int
}
