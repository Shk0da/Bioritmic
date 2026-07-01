package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.api.repository.BookmarkRepository
import com.github.shk0da.bioritmic.api.repository.UserLikeRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import java.util.UUID

class BookmarksServiceTest {

    private val userRepository = Mockito.mock(UserRepository::class.java)
    private val bookmarkRepository = Mockito.mock(BookmarkRepository::class.java)
    private val swipeActionService = Mockito.mock(SwipeActionService::class.java)
    private val userLikeRepository = Mockito.mock(UserLikeRepository::class.java)
    private val userVerificationService = Mockito.mock(UserVerificationService::class.java)

    private val service = BookmarksService(
        userRepository,
        bookmarkRepository,
        swipeActionService,
        userLikeRepository,
        userVerificationService,
    )

    @Test
    fun `saveBookmarks throws when bookmark limit exceeded`() = runBlocking {
        val userId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()

        Mockito.`when`(bookmarkRepository.existsByUserIdAndOtherUserId(userId, otherUserId)).thenReturn(false)
        Mockito.`when`(bookmarkRepository.countByUserId(userId)).thenReturn(BookmarksService.MAX_BOOKMARKS.toLong())

        val exception = assertThrows(ApiException::class.java) {
            runBlocking {
                service.saveBookmarks(
                    userId,
                    listOf(UserBookmark(userId = otherUserId, timestamp = System.currentTimeMillis())),
                )
            }
        }

        assertEquals(ErrorCode.MANY_BOOKMARKS, exception.errorCode)
        Mockito.verify(bookmarkRepository, Mockito.never()).insert(
            Mockito.any(),
            Mockito.any(),
            Mockito.any(),
        )
    }

    @Test
    fun `saveBookmarks allows re-adding existing bookmark at limit`() = runBlocking {
        val userId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()

        Mockito.`when`(bookmarkRepository.existsByUserIdAndOtherUserId(userId, otherUserId)).thenReturn(true)
        Mockito.`when`(bookmarkRepository.findAllByUserId(userId, BookmarksService.MAX_BOOKMARKS, 0))
            .thenReturn(emptyList())
        Mockito.`when`(userRepository.findAllById(emptySet())).thenReturn(emptyFlow())

        service.saveBookmarks(
            userId,
            listOf(UserBookmark(userId = otherUserId, timestamp = System.currentTimeMillis())),
        )

        Mockito.verify(bookmarkRepository, Mockito.never()).countByUserId(userId)
        Mockito.verify(bookmarkRepository, Mockito.never()).insert(
            Mockito.any(),
            Mockito.any(),
            Mockito.any(),
        )
    }

    @Test
    fun `countBookmarks returns repository count`() = runBlocking {
        val userId = UUID.randomUUID()
        Mockito.`when`(bookmarkRepository.countByUserId(userId)).thenReturn(42L)

        val count = service.countBookmarks(userId)

        assertEquals(42, count)
    }
}
