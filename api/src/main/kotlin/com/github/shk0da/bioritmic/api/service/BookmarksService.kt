package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Bookmark
import com.github.shk0da.bioritmic.api.domain.User
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.api.repository.BookmarkRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import kotlinx.coroutines.flow.toList
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class BookmarksService(
    val userRepository: UserRepository,
    val bookmarkRepository: BookmarkRepository
) {

    private val log = LoggerFactory.getLogger(BookmarksService::class.java)

    private val maximumUserBookmarkSize = 100
    private val defaultPageable = PageableRequest(1, maximumUserBookmarkSize, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun findBookmarksByUserId(userId: UUID, pageable: Pageable): List<User> {
        val bookmarks = bookmarkRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
        val usersByBookmarks = bookmarks.map { it.otherUserId!! }.toSet()
        return userRepository.findAllById(usersByBookmarks).toList()
    }

    @Transactional
    suspend fun saveBookmarks(userId: UUID, bookmarks: List<UserBookmark>): List<User> {
        val bookmarkList = bookmarks.filter { it.isFilledInput() }
        val currentElementsCount = bookmarkRepository.countByUserId(userId)
        val totalCount = (currentElementsCount + bookmarkList.count()).toInt()
        if (checkSize(totalCount, maximumUserBookmarkSize, ErrorCode.MANY_BOOKMARKS)) {
            try {
                val bookmarks = bookmarkList.map { Bookmark.of(userId, it) }
                bookmarks.forEach { bookmark ->
                    bookmarkRepository.insert(bookmark.userId!!, bookmark.otherUserId!!, bookmark.timestamp)
                }
            } catch (ex: DataAccessException) {
                log.error("Failed save bookmarks for userId [{}]: {}", userId, ex.message, ex)
                throw ex
            }
        }
        val usersByBookmarks = bookmarkRepository
            .findAllByUserId(userId, defaultPageable.pageSize, defaultPageable.offset)
            .map { item -> item.otherUserId!! }
        return userRepository.findAllById(usersByBookmarks).toList()
    }

    @Transactional
    suspend fun deleteBookmarks(userId: UUID, otherUserId: UUID): List<User> {
        try {
            bookmarkRepository.deleteByUserIdAndOtherUserId(userId, otherUserId)
        } catch (ex: DataAccessException) {
            log.error("Failed delete bookmarks for userId [{}]: {}", userId, ex.message, ex)
            throw ex
        }
        val usersByBookmarks = bookmarkRepository
            .findAllByUserId(userId, defaultPageable.pageSize, defaultPageable.offset)
            .map { item -> item.otherUserId!! }
        return userRepository.findAllById(usersByBookmarks).toList()
    }

    @Transactional
    suspend fun findMatches(userId: UUID): List<User> {
        val mutualIds = bookmarkRepository.findMutualBookmarkUserIds(userId)
        if (mutualIds.isEmpty()) return emptyList()
        return userRepository.findAllById(mutualIds.toSet()).toList()
    }

    @Transactional(readOnly = true)
    suspend fun countMatches(userId: UUID): Int {
        return bookmarkRepository.countMutualBookmarks(userId).toInt()
    }

    @Transactional(readOnly = true)
    suspend fun isBookmarked(userId: UUID, otherUserId: UUID): Boolean {
        return bookmarkRepository.existsByUserIdAndOtherUserId(userId, otherUserId)
    }

    @Transactional
    suspend fun isMatch(userId: UUID, otherUserId: UUID): Boolean {
        return bookmarkRepository.existsByUserIdAndOtherUserId(userId, otherUserId) &&
            bookmarkRepository.existsByUserIdAndOtherUserId(otherUserId, userId)
    }
}
