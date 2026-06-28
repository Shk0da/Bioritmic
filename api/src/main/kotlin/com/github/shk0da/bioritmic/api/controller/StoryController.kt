package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.model.story.StoryReactionRequest
import com.github.shk0da.bioritmic.api.service.StoryService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.http.MediaType
import org.springframework.http.codec.multipart.FilePart
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import javax.validation.Valid

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

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun createStory(
        @RequestPart("file") file: FilePart,
        @RequestPart("caption", required = false) caption: String?
    ): Map<String, Any?> {
        val userId = getUserId()
        val story = storyService.createStory(userId, file, caption)
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

    @PostMapping("/{id}/react", produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun reactToStory(
        @PathVariable id: Long,
        @RequestBody @Valid request: StoryReactionRequest
    ): Map<String, Any?> {
        val userId = getUserId()
        return storyService.reactToStory(id, userId, request.reaction)
    }

    @DeleteMapping("/{id}", produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteStory(@PathVariable id: Long): Map<String, Boolean> {
        val userId = getUserId()
        storyService.deleteStory(id, userId)
        return mapOf("success" to true)
    }
}
