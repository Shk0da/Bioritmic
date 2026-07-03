package com.github.shk0da.bioritmic.api.repository


import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Meeting
import kotlinx.coroutines.reactive.awaitFirstOrNull
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Component
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
@Suppress("TooManyFunctions")
interface MeetingsRepository : CoroutineCrudRepository<Meeting, Meeting.PrimaryKey> {

    @Query("select count(*) from meetings where user_id = :userId")
    suspend fun countByUserId(userId: UUID): Long

    @Query("select count(*) from meetings where user_id = :userId and timestamp >= :since")
    suspend fun countByUserIdSince(userId: UUID, since: Timestamp): Long

    @Query(
        "select * from meetings where other_user_id = :userId and user_id != other_user_id " +
            "and (status is null or status != 'DECLINED') order by timestamp desc limit :limit offset :offset"
    )
    suspend fun findIncomingByUserId(userId: UUID, limit: Int, offset: Long): List<Meeting>

    @Query(
        "select * from meetings where user_id = :userId and user_id != other_user_id " +
            "and status = 'ACCEPTED' order by timestamp desc limit :limit offset :offset"
    )
    suspend fun findSentAcceptedByUserId(userId: UUID, limit: Int, offset: Long): List<Meeting>

    @Query(
        "select * from meetings where user_id = :userId and user_id != other_user_id " +
            "and (status is null or status = 'PENDING') order by timestamp desc limit :limit offset :offset"
    )
    suspend fun findSentPendingByUserId(userId: UUID, limit: Int, offset: Long): List<Meeting>

    @Query("delete from meetings where user_id = :userId")
    suspend fun deleteAllByUserId(userId: UUID)

    @Query("delete from meetings where user_id = :userId and other_user_id = :otherUserId")
    suspend fun deleteByUserIdAndOtherUserId(userId: UUID, otherUserId: UUID)

    @Query(
        "select * from meetings where (user_id = :userId1 and other_user_id = :userId2) " +
            "or (user_id = :userId2 and other_user_id = :userId1) limit 1"
    )
    suspend fun findByUserPair(userId1: UUID, userId2: UUID): Meeting?

    @Query("select * from meetings where user_id = :senderId and other_user_id = :recipientId limit 1")
    suspend fun findBySenderAndRecipient(senderId: UUID, recipientId: UUID): Meeting?

    @Query("SELECT EXISTS(SELECT 1 FROM meetings WHERE user_id = :userId AND other_user_id = :otherUserId)")
    suspend fun existsByUserIdAndOtherUserId(userId: UUID, otherUserId: UUID): Boolean

    @Query(
        "SELECT COUNT(*) FROM meetings WHERE other_user_id = :userId AND timestamp > :since"
    )
    suspend fun countIncomingSince(userId: UUID, since: java.sql.Timestamp): Long

    @Modifying
    @Query(
        "insert into meetings(user_id, other_user_id, other_user_lat, other_user_lon, distance, timestamp, status) " +
            "values (:userId, :otherUserId, :otherUserLat, :otherUserLon, :distance, :timestamp, 'PENDING') " +
            "on conflict (user_id, other_user_id) do update " +
            "set other_user_lat = excluded.other_user_lat, other_user_lon = excluded.other_user_lon, " +
            "distance = excluded.distance, timestamp = excluded.timestamp, status = 'PENDING'"
    )
    suspend fun insert(
        userId: UUID,
        otherUserId: UUID,
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
    suspend fun updateStatus(userId1: UUID, userId2: UUID, status: String): Int {
        return databaseClient.sql(
            "UPDATE meetings SET status = :status " +
                "WHERE (user_id = :userId1 AND other_user_id = :userId2) " +
                "OR (user_id = :userId2 AND other_user_id = :userId1)"
        )
            .bind("status", status)
            .bind("userId1", userId1)
            .bind("userId2", userId2)
            .fetch()
            .rowsUpdated()
            .awaitFirstOrNull()
            ?.toInt()
            ?: 0
    }

    suspend fun updateStatusBySenderAndRecipient(senderId: UUID, recipientId: UUID, status: String): Int {
        return databaseClient.sql(
            "UPDATE meetings SET status = :status WHERE user_id = :senderId AND other_user_id = :recipientId"
        )
            .bind("status", status)
            .bind("senderId", senderId)
            .bind("recipientId", recipientId)
            .fetch()
            .rowsUpdated()
            .awaitFirstOrNull()
            ?.toInt()
            ?: 0
    }
}
