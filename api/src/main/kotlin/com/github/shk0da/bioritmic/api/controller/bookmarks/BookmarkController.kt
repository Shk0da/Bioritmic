package com.github.shk0da.bioritmic.api.controller.bookmarks

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.service.BookmarksService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import io.swagger.annotations.ApiImplicitParam
import io.swagger.annotations.ApiImplicitParams
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
import reactor.core.publisher.Flux
import java.security.Principal
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/bookmarks")
class BookmarkController(val bookmarksService: BookmarksService) {

    // GET /bookmarks/
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    @ApiImplicitParams(value = [
        ApiImplicitParam(name = "page", dataType = "java.lang.Integer", paramType = "query"),
        ApiImplicitParam(name = "size", dataType = "java.lang.Integer", paramType = "query")
    ])
    fun bookmarks(pageable: Pageable): Flux<UserInfo> {
        val userId = getUserId()
        return bookmarksService.findBookmarksByUserId(userId, of(pageable)).map { UserInfo.of(it) }
    }

    // POST /bookmarks/
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun saveBookmarks(@RequestBody @Valid bookmarks: Flux<UserBookmark>, principal: Principal): Flux<UserInfo> {
        val userId = getUserId(principal)
        return bookmarksService.saveBookmarks(userId, bookmarks).map { UserInfo.of(it) }
    }

    @DeleteMapping(value = ["/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun deleteBookmark(@PathVariable userId: Long): Flux<UserInfo> {
        val currentUserId = getUserId()
        return bookmarksService.deleteBookmarks(currentUserId, userId).map { UserInfo.of(it) }
    }
}