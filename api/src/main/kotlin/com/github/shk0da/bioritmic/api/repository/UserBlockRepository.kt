package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserBlock
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface UserBlockRepository : CoroutineCrudRepository<UserBlock, UserBlock.PrimaryKey> {

    suspend fun findByUserIdAndOtherUserId(userId: UUID, otherUserId: UUID): UserBlock?

    @Query("select * from user_blocks where user_id = :userId order by timestamp desc limit :limit offset :offset")
    suspend fun findAllByUserId(userId: UUID, limit: Int, offset: Long): List<UserBlock>

    @Modifying
    @Query(
        "insert into user_blocks(user_id, other_user_id, timestamp) " +
            "values (:userId, :otherUserId, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set timestamp = excluded.timestamp"
    )
    suspend fun insert(userId: UUID, otherUserId: UUID, timestamp: Timestamp?): Int

    @Modifying
    @Query("delete from user_blocks where user_id = :userId and other_user_id = :otherUserId")
    suspend fun delete(userId: UUID, otherUserId: UUID): Int
}
