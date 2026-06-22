package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.model.user.PromptAnswerRequest
import com.github.shk0da.bioritmic.api.service.PromptService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/prompts")
class PromptController(
    private val promptService: PromptService
) {

    private val log = LoggerFactory.getLogger(PromptController::class.java)

    @GetMapping(value = ["/random"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getRandomPrompts(@RequestParam("count", defaultValue = "3") count: Int): List<Map<String, Any?>> {
        val prompts = promptService.getRandomPrompts(count)
        return prompts.map { prompt ->
            mapOf(
                "id" to prompt.id,
                "text" to prompt.text,
                "category" to prompt.category
            )
        }
    }

    @GetMapping(value = ["/answers"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getUserAnswers(): List<Map<String, Any?>> {
        val userId = getUserId()
        val answers = promptService.getUserAnswers(userId)
        return answers.map { answer ->
            mapOf(
                "id" to answer.id,
                "promptId" to answer.promptId,
                "answer" to answer.answer
            )
        }
    }

    @PostMapping(value = ["/answers"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun saveAnswer(@RequestBody request: PromptAnswerRequest): Map<String, Any?> {
        val userId = getUserId()
        val answer = promptService.saveAnswer(userId, request.promptId, request.answer)
        return mapOf(
            "id" to answer.id,
            "promptId" to answer.promptId,
            "answer" to answer.answer
        )
    }
}
