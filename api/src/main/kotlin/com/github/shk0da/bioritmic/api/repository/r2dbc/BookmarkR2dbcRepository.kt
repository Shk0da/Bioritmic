package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.Bookmark
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
interface BookmarkR2dbcRepository : R2dbcRepository<Bookmark, Bookmark.PrimaryKey> {

    @Query("select count(*) from bookmarks where user_id = :userId")
    fun countByUserId(userId: Long): Mono<Long>

    @Query("select * from bookmarks where user_id = :userId order by timestamp desc limit :limit offset :offset")
    fun findAllByUserId(userId: Long, limit: Int, offset: Long): Flux<Bookmark>

    @Query("delete from bookmarks where user_id = :userId")
    fun deleteAllByUserId(userId: Long): Mono<Void>

    @Query("delete from bookmarks where user_id = :userId and other_user_id = :otherUserId")
    fun deleteByUserIdAndOtherUserId(userId: Long, otherUserId: Long): Mono<Void>

    @Modifying
    @Query("insert into bookmarks(user_id, other_user_id, timestamp) " +
            "values (:userId, :otherUserId, :timestamp) " +
            "on conflict (user_id, other_user_id) do update " +
            "set timestamp = excluded.timestamp")
    fun insert(userId: Long, otherUserId: Long, timestamp: Timestamp?): Mono<Int>
}