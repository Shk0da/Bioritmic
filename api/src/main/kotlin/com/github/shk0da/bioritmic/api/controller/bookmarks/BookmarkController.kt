package com.github.shk0da.bioritmic.api.controller.bookmarks

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.user.MatchesResponse
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.service.BookmarksService
import com.github.shk0da.bioritmic.api.service.BoostService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springdoc.core.annotations.ParameterObject
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.security.Principal
import java.util.UUID
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/bookmarks")
class BookmarkController(
    val bookmarksService: BookmarksService,
    val boostService: BoostService,
) {

    // GET /bookmarks/
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun bookmarks(@ParameterObject pageable: Pageable): List<UserInfo> {
        val userId = getUserId()
        return bookmarksService.findBookmarksByUserId(userId, of(pageable)).map { UserInfo.of(it) }
    }

    // POST /bookmarks/
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun saveBookmarks(@RequestBody @Valid bookmarks: List<UserBookmark>, principal: Principal): List<UserInfo> {
        val userId = getUserId(principal)
        return bookmarksService.saveBookmarks(userId, bookmarks).map { UserInfo.of(it) }
    }

    @DeleteMapping(value = ["/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteBookmark(@PathVariable userId: UUID): List<UserInfo> {
        val currentUserId = getUserId()
        return bookmarksService.deleteBookmarks(currentUserId, userId).map { UserInfo.of(it) }
    }

    @GetMapping(value = ["/matches"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getMatches(): MatchesResponse {
        val userId = getUserId()
        val hasActiveBoost = boostService.isBoosted(userId)
        if (!hasActiveBoost) {
            val count = bookmarksService.countMatches(userId)
            return MatchesResponse(count = count, blurred = true)
        }
        val matches = bookmarksService.findMatches(userId).map { user -> UserInfo.of(user) }
        return MatchesResponse(matches = matches, count = matches.size, blurred = false)
    }

    @GetMapping(value = ["/matches/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun checkMatch(@PathVariable userId: UUID): Map<String, Boolean> {
        val currentUserId = getUserId()
        val isMatch = bookmarksService.isMatch(currentUserId, userId)
        return mapOf("isMatch" to isMatch)
    }

    @GetMapping(value = ["/{userId}/exists"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun isBookmarked(@PathVariable userId: UUID): Map<String, Boolean> {
        val currentUserId = getUserId()
        return mapOf("bookmarked" to bookmarksService.isBookmarked(currentUserId, userId))
    }
}
