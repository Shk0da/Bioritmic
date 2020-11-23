package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.UserBlock
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = r2dbcTransactionManager)
interface UserBlockR2dbcRepository : R2dbcRepository<UserBlock, UserBlock.PrimaryKey> {

    fun findByUserIdAndOtherUserId(userId: Long, otherUserId: Long): Mono<UserBlock?>

    @Query("select * from user_blocks where user_id = :userId order by timestamp desc limit :limit offset :offset")
    fun findAllByUserId(userId: Long, limit: Int, offset: Long): Flux<UserBlock>

    @Modifying
    @Query("insert into user_blocks(user_id, other_user_id, timestamp) " +
            "values (:userId, :otherUserId, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set timestamp = excluded.timestamp")
    fun insert(userId: Long, otherUserId: Long, timestamp: Timestamp?): Mono<Int>

    @Modifying
    @Query("delete from user_blocks where user_id = :userId and other_user_id = :otherUserId")
    fun delete(userId: Long, otherUserId: Long): Mono<Int>
}