package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.readTransactionManager
import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserPhoto
import io.r2dbc.spi.ConnectionFactory
import kotlinx.coroutines.reactive.awaitFirstOrNull
import org.slf4j.LoggerFactory
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Component
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface UserPhotoRepository : CoroutineCrudRepository<UserPhoto, Long> {

    @Query("select * from user_photos where user_id = :userId order by photo_order asc")
    suspend fun findAllByUserId(userId: UUID): List<UserPhoto>

    @Query("select * from user_photos where user_id = :userId and id = :photoId")
    suspend fun findByUserIdAndPhotoId(userId: UUID, photoId: Long): UserPhoto?

    @Query("delete from user_photos where user_id = :userId and id = :photoId")
    suspend fun deleteByUserIdAndPhotoId(userId: UUID, photoId: Long)

    @Query("delete from user_photos where user_id = :userId")
    suspend fun deleteAllByUserId(userId: UUID)

    @Modifying
    @Query("update user_photos set photo_order = :newOrder where id = :photoId")
    suspend fun updateOrder(photoId: Long, newOrder: Int)
}

@Component
@Transactional(transactionManager = readTransactionManager)
class UserPhotoBatchRepository(private val slaveConnectionFactory: ConnectionFactory) {

    private val log = LoggerFactory.getLogger(UserPhotoBatchRepository::class.java)
    private val databaseClient: DatabaseClient by lazy { DatabaseClient.create(slaveConnectionFactory) }

    suspend fun findProfilePhotosByUserIds(userIds: List<UUID>): Map<UUID, String> {
        if (userIds.isEmpty()) return emptyMap()

        val placeholders = userIds.mapIndexed { i, _ -> ":id$i" }.joinToString(",")
        val sql = "SELECT user_id, s3_key FROM user_photos WHERE user_id IN ($placeholders) AND photo_order = 0"

        return databaseClient.sql(sql)
            .let { query ->
                userIds.forEachIndexed { i, id -> query.bind("id$i", id) }
                query
            }
            .fetch()
            .all()
            .map { row ->
                val userId = row["user_id"] as? UUID
                val s3Key = row["s3_key"] as? String ?: ""
                userId to s3Key
            }
            .collectList()
            .awaitFirstOrNull()
            ?.mapNotNull { (userId, s3Key) -> userId?.let { it to s3Key } }
            ?.toMap()
            ?: emptyMap()
    }
}
