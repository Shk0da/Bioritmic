package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.Meeting
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = r2dbcTransactionManager)
interface MeetingsR2dbcRepository : R2dbcRepository<Meeting, Meeting.PrimaryKey> {

    @Query("select count(*) from meetings where user_id = :userId")
    fun countByUserId(userId: Long): Mono<Long>

    @Query("select * from meetings where user_id = :userId order by timestamp desc limit :limit offset :offset")
    fun findAllByUserId(userId: Long, limit: Int, offset: Long): Flux<Meeting>

    @Query("delete from meetings where user_id = :userId")
    fun deleteAllByUserId(userId: Long): Mono<Void>

    @Query("delete from meetings where user_id = :userId and other_user_id = :otherUserId")
    fun deleteByUserIdAndOtherUserId(userId: Long, otherUserId: Long): Mono<Void>

    @Modifying
    @Query("insert into meetings(user_id, other_user_id, other_user_lat, other_user_lon, distance, timestamp) " +
            "values (:userId, :otherUserId, :otherUserLat, :otherUserLon, :distance, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set other_user_lat = excluded.other_user_lat, other_user_lon = excluded.other_user_lon, " +
            "distance = excluded.distance, timestamp = excluded.timestamp")
    fun insert(userId: Long, otherUserId: Long, otherUserLat: Double?, otherUserLon: Double?, distance: Double?, timestamp: Timestamp?): Mono<Int>
}