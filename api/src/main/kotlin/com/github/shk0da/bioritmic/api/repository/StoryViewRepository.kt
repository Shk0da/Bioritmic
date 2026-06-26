package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.readTransactionManager
import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.StoryView
import io.r2dbc.spi.ConnectionFactory
import kotlinx.coroutines.reactive.awaitFirstOrNull
import org.slf4j.LoggerFactory
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface StoryViewRepository : CoroutineCrudRepository<StoryView, Long> {

    @Modifying
    @Query(
        "INSERT INTO story_views (story_id, viewer_id, viewed_at) VALUES (:storyId, :viewerId, NOW()) " +
            "ON CONFLICT (story_id, viewer_id) DO NOTHING"
    )
    suspend fun recordView(storyId: Long, viewerId: UUID): Int

    @Transactional(readOnly = true)
    @Query("SELECT * FROM story_views WHERE story_id = :storyId AND viewer_id = :viewerId LIMIT 1")
    suspend fun findByStoryIdAndViewerId(storyId: Long, viewerId: Long): StoryView?

    @Transactional(readOnly = true)
    @Query("SELECT EXISTS(SELECT 1 FROM story_views WHERE story_id = :storyId AND viewer_id = :viewerId)")
    suspend fun existsByStoryIdAndViewerId(storyId: Long, viewerId: UUID): Boolean

    @Transactional(readOnly = true)
    @Query("SELECT COUNT(*) FROM story_views WHERE story_id = :storyId")
    suspend fun countViewersByStoryId(storyId: Long): Int
}

@Repository
@Transactional(transactionManager = readTransactionManager)
class StoryViewBatchRepository(private val slaveConnectionFactory: ConnectionFactory) {

    private val log = LoggerFactory.getLogger(StoryViewBatchRepository::class.java)
    private val databaseClient: DatabaseClient by lazy { DatabaseClient.create(slaveConnectionFactory) }

    suspend fun countViewersByStoryIds(storyIds: List<Long>): Map<Long, Int> {
        if (storyIds.isEmpty()) return emptyMap()

        val placeholders = storyIds.mapIndexed { i, _ -> ":id$i" }.joinToString(",")
        val sql = "SELECT story_id, COUNT(*) as cnt FROM story_views WHERE story_id IN ($placeholders) GROUP BY story_id"

        val result = databaseClient.sql(sql)
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
                val count = (row["cnt"] as? Number)?.toInt() ?: 0
                storyId to count
            }
            .collectList()
            .awaitFirstOrNull() ?: emptyList()

        return result.toMap()
    }

    suspend fun existsByStoryIdsAndViewerId(storyIds: List<Long>, viewerId: UUID): Set<Long> {
        if (storyIds.isEmpty()) return emptySet()

        val placeholders = storyIds.mapIndexed { i, _ -> ":id$i" }.joinToString(",")
        val sql = "SELECT DISTINCT story_id FROM story_views WHERE story_id IN ($placeholders) AND viewer_id = :viewerId"

        val result = databaseClient.sql(sql)
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
                (row["story_id"] as? Number)?.toLong() ?: 0L
            }
            .collectList()
            .awaitFirstOrNull() ?: emptyList()

        return result.toSet()
    }
}
