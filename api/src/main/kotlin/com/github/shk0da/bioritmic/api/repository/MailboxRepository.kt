package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserMail
import kotlinx.coroutines.flow.Flow
import org.springframework.data.domain.Pageable
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface MailboxRepository : CoroutineCrudRepository<UserMail, Long> {

    @Query(
        """
        SELECT DISTINCT ON (other_user_id)
            from_user_id, to_user_id,
            CASE WHEN from_user_id = :userId THEN to_user_id ELSE from_user_id END AS other_user_id,
            id, message, media_type, media_s3_key, timestamp, is_read, reply_to_message_id, reply_target_unavailable
        FROM mailbox
            WHERE (from_user_id = :userId OR to_user_id = :userId)
              AND (
                COALESCE(media_type, '') <> 'SYSTEM'
                OR to_user_id = :userId
              )
        ORDER BY other_user_id, timestamp DESC, id DESC
        LIMIT :limit OFFSET :offset
        """
    )
    suspend fun findAllMailsByUserId(userId: UUID, limit: Int, offset: Long): List<UserMail>

    @Query(
        """
        SELECT * FROM mailbox
        WHERE (
            (from_user_id = :userId1 AND to_user_id = :userId2)
            OR (from_user_id = :userId2 AND to_user_id = :userId1)
          )
          AND (
            COALESCE(media_type, '') <> 'SYSTEM'
            OR to_user_id = :viewerUserId
          )
        ORDER BY timestamp ASC
        """
    )
    suspend fun findConversationBetweenUsers(userId1: UUID, userId2: UUID, viewerUserId: UUID): List<UserMail>

    @Query(
        """
        SELECT * FROM mailbox
        WHERE (
            (from_user_id = :userId1 AND to_user_id = :userId2)
            OR (from_user_id = :userId2 AND to_user_id = :userId1)
          )
          AND (
            COALESCE(media_type, '') <> 'SYSTEM'
            OR to_user_id = :viewerUserId
          )
        ORDER BY id DESC
        LIMIT :limit
        """
    )
    suspend fun findLatestConversationMessages(
        userId1: UUID,
        userId2: UUID,
        viewerUserId: UUID,
        limit: Int,
    ): List<UserMail>

    @Query(
        """
        SELECT * FROM mailbox
        WHERE (
            (from_user_id = :userId1 AND to_user_id = :userId2)
            OR (from_user_id = :userId2 AND to_user_id = :userId1)
          )
          AND (
            COALESCE(media_type, '') <> 'SYSTEM'
            OR to_user_id = :viewerUserId
          )
          AND id < :beforeId
        ORDER BY id DESC
        LIMIT :limit
        """
    )
    suspend fun findOlderConversationMessages(
        userId1: UUID,
        userId2: UUID,
        viewerUserId: UUID,
        beforeId: Long,
        limit: Int
    ): List<UserMail>

    @Query(
        """
        SELECT EXISTS(
            SELECT 1 FROM mailbox
            WHERE (
                (from_user_id = :userId1 AND to_user_id = :userId2)
                OR (from_user_id = :userId2 AND to_user_id = :userId1)
              )
              AND (
                COALESCE(media_type, '') <> 'SYSTEM'
                OR to_user_id = :viewerUserId
              )
              AND id < :beforeId
        )
        """
    )
    suspend fun hasOlderConversationMessages(
        userId1: UUID,
        userId2: UUID,
        viewerUserId: UUID,
        beforeId: Long,
    ): Boolean

    @Query(
        """
        SELECT * FROM mailbox
        WHERE (
            (from_user_id = :userId1 AND to_user_id = :userId2)
           OR (from_user_id = :userId2 AND to_user_id = :userId1)
          )
        """
    )
    suspend fun findAllBetweenUsers(userId1: UUID, userId2: UUID): List<UserMail>

    fun findAllByFromUserIdAndToUserId(from: UUID, to: UUID, pageable: Pageable?): Flow<UserMail>
    @Modifying
    @Query(
        """
        DELETE FROM mailbox m
        WHERE (m.from_user_id = :userId AND m.to_user_id = :currentUserId)
           OR (m.to_user_id = :userId AND m.from_user_id = :currentUserId)
        """
    )
    suspend fun deleteAllMailByBetweenTwoUserId(currentUserId: UUID, userId: UUID)
    @Query(
        """
        SELECT COUNT(DISTINCT from_user_id) FROM mailbox
        WHERE to_user_id = :userId AND is_read = false AND timestamp > :since
        """
    )
    suspend fun countUnreadSenders(userId: UUID, since: java.sql.Timestamp): Long
    @Modifying
    @Query(
        """
        UPDATE mailbox
        SET is_read = true
        WHERE to_user_id = :readerId
          AND from_user_id = :senderId
          AND is_read = false
        """
    )
    suspend fun markIncomingAsRead(readerId: UUID, senderId: UUID): Int
    @Query(
        """
        SELECT id FROM mailbox
        WHERE to_user_id = :readerId
          AND from_user_id = :senderId
          AND is_read = false
        ORDER BY id ASC
        """
    )
    suspend fun findUnreadIncomingIds(readerId: UUID, senderId: UUID): List<Long>

    @Modifying
    @Query("UPDATE mailbox SET reply_target_unavailable = true WHERE reply_to_message_id IN (:ids)")
    suspend fun markReplyTargetsUnavailable(ids: List<Long>): Int

    @Modifying
    @Query("DELETE FROM mailbox WHERE id IN (:ids) AND from_user_id = :userId")
    suspend fun deleteByIdsAndFromUserId(ids: List<Long>, userId: UUID): Int

    @Transactional(readOnly = true)
    @Query(
        """
        SELECT COUNT(*) FROM mailbox
        WHERE media_s3_key = :s3Key
          AND (from_user_id = :userId OR to_user_id = :userId)
        """
    )
    suspend fun countByMediaS3KeyForParticipant(s3Key: String, userId: UUID): Long

    @Transactional(readOnly = true)
    @Query(
        """
        SELECT DISTINCT media_s3_key FROM mailbox
        WHERE media_s3_key IS NOT NULL AND media_s3_key <> ''
        """
    )
    suspend fun findAllMediaS3Keys(): List<String>
}
