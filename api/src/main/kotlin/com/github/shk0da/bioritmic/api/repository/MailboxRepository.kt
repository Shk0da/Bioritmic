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
        "select id, from_user_id, to_user_id, message, timestamp " +
            "from mailbox " +
            "where from_user_id = :userId or to_user_id = :userId " +
            "order by timestamp desc " +
            "limit :limit offset :offset"
    )
    suspend fun findAllMailsByUserId(userId: UUID, limit: Int, offset: Long): List<UserMail>

    @Query(
        "select id, from_user_id, to_user_id, message, timestamp " +
            "from mailbox " +
            "where (from_user_id = :userId1 and to_user_id = :userId2) " +
                "or (from_user_id = :userId2 and to_user_id = :userId1) " +
            "order by timestamp asc"
    )
    suspend fun findConversationBetweenUsers(userId1: UUID, userId2: UUID): List<UserMail>

    fun findAllByFromUserIdAndToUserId(from: UUID, to: UUID, pageable: Pageable?): Flow<UserMail>

    @Query(
        "delete from mailbox m where " +
            "(m.from_user_id = :userId and m.to_user_id = :currentUserId) or " +
            "(m.to_user_id = :userId and m.from_user_id = :currentUserId)"
    )
    suspend fun deleteAllMailByBetweenTwoUserId(currentUserId: UUID, userId: UUID)

    @Query(
        "SELECT COUNT(DISTINCT from_user_id) FROM mailbox " +
            "WHERE to_user_id = :userId AND from_user_id != :userId AND timestamp > :since"
    )
    suspend fun countUnreadSenders(userId: UUID, since: java.sql.Timestamp): Long
}
