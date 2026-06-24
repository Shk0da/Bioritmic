package com.github.shk0da.bioritmic.api.repository


import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Meeting
import kotlinx.coroutines.reactive.awaitFirst
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Component
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = transactionManager)
interface MeetingsRepository : CoroutineCrudRepository<Meeting, Meeting.PrimaryKey> {

    @Query("select count(*) from meetings where user_id = :userId")
    suspend fun countByUserId(userId: Long): Long

    @Query("select * from meetings where other_user_id = :userId and user_id != other_user_id and (status is null or status != 'DECLINED') order by timestamp desc limit :limit offset :offset")
    suspend fun findAllByUserId(userId: Long, limit: Int, offset: Long): List<Meeting>

    @Query("delete from meetings where user_id = :userId")
    suspend fun deleteAllByUserId(userId: Long)

    @Query("delete from meetings where user_id = :userId and other_user_id = :otherUserId")
    suspend fun deleteByUserIdAndOtherUserId(userId: Long, otherUserId: Long)

    @Query("select * from meetings where (user_id = :userId1 and other_user_id = :userId2) or (user_id = :userId2 and other_user_id = :userId1)")
    suspend fun findByUserPair(userId1: Long, userId2: Long): Meeting?

    @Modifying
    @Query(
        "insert into meetings(user_id, other_user_id, other_user_lat, other_user_lon, distance, timestamp) " +
            "values (:userId, :otherUserId, :otherUserLat, :otherUserLon, :distance, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set other_user_lat = excluded.other_user_lat, other_user_lon = excluded.other_user_lon, " +
            "distance = excluded.distance, timestamp = excluded.timestamp"
    )
    suspend fun insert(
        userId: Long,
        otherUserId: Long,
        otherUserLat: Double?,
        otherUserLon: Double?,
        distance: Double?,
        timestamp: Timestamp?
    ): Int
}

@Component
class MeetingStatusUpdater(
    private val databaseClient: DatabaseClient
) {
    suspend fun updateStatus(userId1: Long, userId2: Long, status: String): Int {
        return databaseClient.sql(
            "UPDATE meetings SET status = :status WHERE (user_id = :userId1 AND other_user_id = :userId2) OR (user_id = :userId2 AND other_user_id = :userId1)"
        )
            .bind("status", status)
            .bind("userId1", userId1)
            .bind("userId2", userId2)
            .fetch()
            .rowsUpdated()
            .awaitFirst()
            .toInt()
    }
}
