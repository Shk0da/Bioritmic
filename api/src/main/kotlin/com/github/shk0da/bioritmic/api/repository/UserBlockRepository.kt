package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserBlock
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = transactionManager)
interface UserBlockRepository : CoroutineCrudRepository<UserBlock, UserBlock.PrimaryKey> {

    suspend fun findByUserIdAndOtherUserId(userId: Long, otherUserId: Long): UserBlock?

    @Query("select * from user_blocks where user_id = :userId order by timestamp desc limit :limit offset :offset")
    suspend fun findAllByUserId(userId: Long, limit: Int, offset: Long): List<UserBlock>

    @Modifying
    @Query(
        "insert into user_blocks(user_id, other_user_id, timestamp) " +
            "values (:userId, :otherUserId, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set timestamp = excluded.timestamp"
    )
    suspend fun insert(userId: Long, otherUserId: Long, timestamp: Timestamp?): Int

    @Modifying
    @Query("delete from user_blocks where user_id = :userId and other_user_id = :otherUserId")
    suspend fun delete(userId: Long, otherUserId: Long): Int
}
