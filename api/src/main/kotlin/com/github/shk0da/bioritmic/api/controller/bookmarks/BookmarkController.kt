package com.github.shk0da.bioritmic.api.controller.bookmarks

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.user.UserBookmark
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.api.service.UserService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import java.security.Principal
import javax.validation.Valid

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/bookmarks")
class BookmarkController(val userService: UserService) {

    private val log = LoggerFactory.getLogger(BookmarkController::class.java)

    // GET /bookmarks/
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun bookmarks(): Flux<UserInfo> {
        val userId = getUserId()
        return userService.findBookmarksByUserId(userId).map { UserInfo.of(it) }
    }

    // POST /bookmarks/
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun saveBookmarks(@Valid @RequestBody bookmarks: Flux<UserBookmark>, principal: Principal): Flux<UserInfo> {
        val userId = getUserId(principal)
        return userService.saveBookmarks(userId, bookmarks).map { UserInfo.of(it) }
    }

    // DELETE /bookmarks/
    @DeleteMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun deleteBookmarks(@Valid @RequestBody bookmarks: List<UserBookmark>, principal: Principal): Flux<UserInfo> {
        val userId = getUserId(principal)
        return userService.deleteBookmarks(userId, bookmarks).map { UserInfo.of(it) }
    }
}