package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.Bookmark
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono

@Repository
@Transactional(transactionManager = r2dbcTransactionManager)
interface BookmarkR2dbcRepository : R2dbcRepository<Bookmark, Long> {

    fun findAllByUserId(userId: Long): Flux<Bookmark>

    fun findAllByBookmarkUserId(bookmarkUserId: Long): Flux<Bookmark>

    fun deleteByUserIdAndBookmarkUserIdIn(userId: Long, bookmarks: List<Long>): Mono<Void>
}