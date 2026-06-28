package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.readTransactionManager
import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.StoryReaction
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
interface StoryReactionRepository : CoroutineCrudRepository<StoryReaction, Long> {

    @Modifying
    @Query(
        "INSERT INTO story_reactions (story_id, viewer_id, reaction, reacted_at) " +
            "VALUES (:storyId, :viewerId, :reaction, NOW()) " +
            "ON CONFLICT (story_id, viewer_id) DO UPDATE " +
            "SET reaction = EXCLUDED.reaction, reacted_at = NOW()"
    )
    suspend fun upsert(storyId: Long, viewerId: UUID, reaction: String): Int
}

@Repository
@Transactional(transactionManager = readTransactionManager)
class StoryReactionBatchRepository(private val slaveConnectionFactory: ConnectionFactory) {

    private val databaseClient: DatabaseClient by lazy { DatabaseClient.create(slaveConnectionFactory) }

    suspend fun findReactionsByStoryIdsAndViewerId(storyIds: List<Long>, viewerId: UUID): Map<Long, String> {
        if (storyIds.isEmpty()) return emptyMap()

        val placeholders = storyIds.mapIndexed { i, _ -> ":id$i" }.joinToString(",")
        val sql =
            "SELECT story_id, reaction FROM story_reactions " +
                "WHERE story_id IN ($placeholders) AND viewer_id = :viewerId"

        return databaseClient.sql(sql)
            .let { initialQuery ->
                var query = initialQuery
                storyIds.forEachIndexed { i, id ->
                    query = query.bind("id$i", id)
                }
                query.bind("viewerId", viewerId)
            }
            .fetch()
            .all()
            .map { row ->
                val storyId = (row["story_id"] as? Number)?.toLong() ?: 0L
                val reaction = row["reaction"] as? String ?: ""
                storyId to reaction
            }
            .collectList()
            .awaitFirstOrNull()
            ?.toMap()
            ?: emptyMap()
    }

    suspend fun countReactionsByStoryIds(storyIds: List<Long>): Map<Long, Map<String, Int>> {
        if (storyIds.isEmpty()) return emptyMap()

        val placeholders = storyIds.mapIndexed { i, _ -> ":id$i" }.joinToString(",")
        val sql =
            "SELECT story_id, reaction, COUNT(*) AS cnt FROM story_reactions " +
                "WHERE story_id IN ($placeholders) GROUP BY story_id, reaction"

        return databaseClient.sql(sql)
            .let { initialQuery ->
                var query = initialQuery
                storyIds.forEachIndexed { i, id ->
                    query = query.bind("id$i", id)
                }
                query
            }
            .fetch()
            .all()
            .map { row ->
                val storyId = (row["story_id"] as? Number)?.toLong() ?: 0L
                val reaction = row["reaction"] as? String ?: ""
                val count = (row["cnt"] as? Number)?.toInt() ?: 0
                Triple(storyId, reaction, count)
            }
            .collectList()
            .awaitFirstOrNull()
            ?.groupBy({ it.first }, { it.second to it.third })
            ?.mapValues { (_, values) -> values.associate { it.first to it.second } }
            ?: emptyMap()
    }
}
