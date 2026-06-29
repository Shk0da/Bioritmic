package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserMail
import kotlinx.coroutines.flow.Flow
import org.springframework.data.domain.Pageable
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
        SELECT * FROM mailbox
        WHERE from_user_id = :userId OR to_user_id = :userId
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :offset
        """
    )
    suspend fun findAllMailsByUserId(userId: UUID, limit: Int, offset: Long): List<UserMail>

    @Query(
        """
        SELECT * FROM mailbox
        WHERE (from_user_id = :userId1 AND to_user_id = :userId2)
           OR (from_user_id = :userId2 AND to_user_id = :userId1)
        ORDER BY timestamp ASC
        """
    )
    suspend fun findConversationBetweenUsers(userId1: UUID, userId2: UUID): List<UserMail>

    @Query(
        """
        SELECT * FROM mailbox
        WHERE (from_user_id = :userId1 AND to_user_id = :userId2)
           OR (from_user_id = :userId2 AND to_user_id = :userId1)
        """
    )
    suspend fun findAllBetweenUsers(userId1: UUID, userId2: UUID): List<UserMail>

    fun findAllByFromUserIdAndToUserId(from: UUID, to: UUID, pageable: Pageable?): Flow<UserMail>

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
        WHERE to_user_id = :userId AND from_user_id != :userId AND timestamp > :since
        """
    )
    suspend fun countUnreadSenders(userId: UUID, since: java.sql.Timestamp): Long
}
