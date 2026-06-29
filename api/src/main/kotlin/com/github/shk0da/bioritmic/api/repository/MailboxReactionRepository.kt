package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.readTransactionManager
import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.MailboxReaction
import io.r2dbc.spi.ConnectionFactory
import kotlinx.coroutines.reactive.awaitFirstOrNull
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface MailboxReactionRepository : CoroutineCrudRepository<MailboxReaction, Long> {

    @Modifying
    @Query(
        "INSERT INTO mailbox_reactions (mail_id, user_id, reaction, reacted_at) " +
            "VALUES (:mailId, :userId, :reaction, NOW()) " +
            "ON CONFLICT (mail_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction, reacted_at = NOW()"
    )
    suspend fun upsert(mailId: Long, userId: UUID, reaction: String): Int

    @Query("SELECT reaction FROM mailbox_reactions WHERE mail_id = :mailId AND user_id = :userId LIMIT 1")
    suspend fun findReaction(mailId: Long, userId: UUID): String?

    @Modifying
    @Query("DELETE FROM mailbox_reactions WHERE mail_id = :mailId AND user_id = :userId")
    suspend fun deleteReaction(mailId: Long, userId: UUID): Int
}

@Repository
@Transactional(transactionManager = readTransactionManager)
class MailboxReactionBatchRepository(private val slaveConnectionFactory: ConnectionFactory) {

    private val databaseClient: DatabaseClient by lazy { DatabaseClient.create(slaveConnectionFactory) }

    suspend fun findReactionsByMailIdsAndUserId(mailIds: List<Long>, userId: UUID): Map<Long, String> {
        if (mailIds.isEmpty()) return emptyMap()
        val placeholders = mailIds.mapIndexed { i, _ -> ":id$i" }.joinToString(",")
        val sql = "SELECT mail_id, reaction FROM mailbox_reactions WHERE mail_id IN ($placeholders) AND user_id = :userId"
        return databaseClient.sql(sql)
            .let { q ->
                var query = q
                mailIds.forEachIndexed { i, id -> query = query.bind("id$i", id) }
                query.bind("userId", userId)
            }
            .fetch()
            .all()
            .map { row ->
                val mailId = (row["mail_id"] as? Number)?.toLong() ?: 0L
                val reaction = row["reaction"] as? String ?: ""
                mailId to reaction
            }
            .collectList()
            .awaitFirstOrNull()
            ?.toMap()
            ?: emptyMap()
    }

    suspend fun countReactionsByMailIds(mailIds: List<Long>): Map<Long, Map<String, Int>> {
        if (mailIds.isEmpty()) return emptyMap()
        val placeholders = mailIds.mapIndexed { i, _ -> ":id$i" }.joinToString(",")
        val sql =
            "SELECT mail_id, reaction, COUNT(*) AS cnt FROM mailbox_reactions " +
                "WHERE mail_id IN ($placeholders) GROUP BY mail_id, reaction"
        return databaseClient.sql(sql)
            .let { q ->
                var query = q
                mailIds.forEachIndexed { i, id -> query = query.bind("id$i", id) }
                query
            }
            .fetch()
            .all()
            .map { row ->
                val mailId = (row["mail_id"] as? Number)?.toLong() ?: 0L
                val reaction = row["reaction"] as? String ?: ""
                val count = (row["cnt"] as? Number)?.toInt() ?: 0
                Triple(mailId, reaction, count)
            }
            .collectList()
            .awaitFirstOrNull()
            ?.groupBy({ it.first }, { it.second to it.third })
            ?.mapValues { (_, values) -> values.associate { it.first to it.second } }
            ?: emptyMap()
    }
}
