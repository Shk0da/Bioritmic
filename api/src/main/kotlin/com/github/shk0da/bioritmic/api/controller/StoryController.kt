package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.service.StoryService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_WITH_VERSION_1 + "/stories")
class StoryController(
    val storyService: StoryService
) {

    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getFeed(): List<Map<String, Any?>> {
        val userId = getUserId()
        return storyService.getFeed(userId)
    }

    @PostMapping(consumes = [MediaType.APPLICATION_JSON_VALUE], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun createStory(@RequestBody request: CreateStoryRequest): Map<String, Any?> {
        val userId = getUserId()
        val story = storyService.createStory(userId, request.mediaUrl, request.caption)
        return mapOf(
            "id" to story.id,
            "mediaUrl" to story.mediaUrl,
            "caption" to story.caption,
            "expiresAt" to story.expiresAt?.time,
            "createdAt" to story.createdAt?.time
        )
    }

    @PostMapping("/{id}/view", produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun viewStory(@PathVariable id: Long): Map<String, Boolean> {
        val userId = getUserId()
        storyService.viewStory(id, userId)
        return mapOf("success" to true)
    }

    data class CreateStoryRequest(
        val mediaUrl: String,
        val caption: String? = null
    )
}
