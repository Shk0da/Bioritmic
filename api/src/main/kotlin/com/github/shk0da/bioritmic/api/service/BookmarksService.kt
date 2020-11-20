package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Bookmark
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.api.repository.r2dbc.BookmarkR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserR2dbcRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import reactor.core.publisher.Mono.just

@Service
class BookmarksService(val userR2dbcRepository: UserR2dbcRepository,
                       val bookmarkR2dbcRepository: BookmarkR2dbcRepository) {

    private val log = LoggerFactory.getLogger(BookmarksService::class.java)

    private val maximumUserBookmarkSize = 100
    private val defaultPageable = PageableRequest(1, maximumUserBookmarkSize, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    fun findBookmarksByUserId(userId: Long, pageable: Pageable): Flux<User> {
        return bookmarkR2dbcRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
                .collectList()
                .map { bookmarks ->
                    userR2dbcRepository.findAllById(bookmarks.map { it.otherUserId })
                }
                .flatMapMany { it }
    }

    @Transactional
    fun saveBookmarks(userId: Long, bookmarks: Flux<UserBookmark>): Flux<User> {
        val bookmarkList = bookmarks.filter { it.isFilledInput() }.cache()
        return bookmarkR2dbcRepository.countByUserId(userId)
                .map { currentElementsCount ->
                    val bookmarkCopy = Flux.from(bookmarkList)
                    bookmarkCopy.count().map { newElementsCount -> (currentElementsCount + newElementsCount).toInt() }
                }
                .flatMap { it }
                .filter { totalCount -> checkSize(totalCount, maximumUserBookmarkSize, ErrorCode.MANY_BOOKMARKS) }
                .map {
                    bookmarkList
                            .map { Bookmark.of(userId, it) }
                            .flatMap { bookmark ->
                                bookmarkR2dbcRepository.insert(
                                        bookmark.userId!!, bookmark.otherUserId!!, bookmark.timestamp
                                ).map { userId }
                            }
                }
                .flatMapMany { it }
                .switchIfEmpty(just(userId))
                .map { id ->
                    val usersByBookmarks = bookmarkR2dbcRepository.findAllByUserId(id, defaultPageable.pageSize, defaultPageable.offset)
                            .map { item -> item.otherUserId!! }
                    userR2dbcRepository.findAllById(usersByBookmarks)
                }
                .flatMap { it }
                .doOnError {
                    log.error("Failed save bookmarks for userId [{}]: {}", userId, it.message)
                    Mono.error<Flux<Any>>(it)
                }
    }

    @Transactional
    fun deleteBookmarks(userId: Long, otherUserId: Long): Flux<User> {
        return bookmarkR2dbcRepository
                .deleteByUserIdAndOtherUserId(userId, otherUserId)
                .map { userId }
                .switchIfEmpty(just(userId))
                .map { id ->
                    val usersByBookmarks = bookmarkR2dbcRepository.findAllByUserId(id, defaultPageable.pageSize, defaultPageable.offset)
                            .map { item -> item.otherUserId!! }
                    userR2dbcRepository.findAllById(usersByBookmarks)
                }
                .flatMapMany { it }
                .doOnError {
                    log.error("Failed delete bookmarks for userId [{}]: {}", userId, it.message)
                    Mono.error<Flux<Any>>(it)
                }
    }
}
