package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Bookmark
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.api.repository.BookmarkJpaRepository
import com.github.shk0da.bioritmic.api.repository.UserJpaRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class BookmarksService(
    val userJpaRepository: UserJpaRepository,
    val bookmarkJpaRepository: BookmarkJpaRepository
) {

    private val log = LoggerFactory.getLogger(BookmarksService::class.java)

    private val maximumUserBookmarkSize = 100
    private val defaultPageable = PageableRequest(1, maximumUserBookmarkSize, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    fun findBookmarksByUserId(userId: Long, pageable: Pageable): List<User> {
        val bookmarks = bookmarkJpaRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
        val usersByBookmarks = bookmarks.map { it.otherUserId!! }.toSet()
        return userJpaRepository.findAllById(usersByBookmarks)
    }

    @Transactional
    fun saveBookmarks(userId: Long, bookmarks: List<UserBookmark>): List<User> {
        val bookmarkList = bookmarks.filter { it.isFilledInput() }
        val currentElementsCount = bookmarkJpaRepository.countByUserId(userId)
        val totalCount = (currentElementsCount + bookmarkList.count()).toInt()
        if (checkSize(totalCount, maximumUserBookmarkSize, ErrorCode.MANY_BOOKMARKS)) {
            try {
                val bookmarks = bookmarkList.map { Bookmark.of(userId, it) }
                bookmarks.forEach { bookmark ->
                    bookmarkJpaRepository.insert(bookmark.userId!!, bookmark.otherUserId!!, bookmark.timestamp)
                }
            } catch (ex: Exception) {
                log.error("Failed save bookmarks for userId [{}]: {}", userId, ex.message)
            }
        }
        val usersByBookmarks = bookmarkJpaRepository
            .findAllByUserId(userId, defaultPageable.pageSize, defaultPageable.offset)
            .map { item -> item.otherUserId!! }
        return userJpaRepository.findAllById(usersByBookmarks)
    }

    @Transactional
    fun deleteBookmarks(userId: Long, otherUserId: Long): List<User> {
        try {
            bookmarkJpaRepository.deleteByUserIdAndOtherUserId(userId, otherUserId)
        } catch (ex: Exception) {
            log.error("Failed delete bookmarks for userId [{}]: {}", userId, ex.message)
        }
        val usersByBookmarks = bookmarkJpaRepository
            .findAllByUserId(userId, defaultPageable.pageSize, defaultPageable.offset)
            .map { item -> item.otherUserId!! }
        return userJpaRepository.findAllById(usersByBookmarks)
    }
}
