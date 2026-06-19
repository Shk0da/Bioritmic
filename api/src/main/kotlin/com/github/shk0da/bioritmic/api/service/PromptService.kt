package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Prompt
import com.github.shk0da.bioritmic.api.domain.UserPromptAnswer
import com.github.shk0da.bioritmic.api.repository.PromptRepository
import com.github.shk0da.bioritmic.api.repository.UserPromptAnswerRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Service
class PromptService(
    private val promptRepository: PromptRepository,
    private val userPromptAnswerRepository: UserPromptAnswerRepository
) {

    private val log = LoggerFactory.getLogger(PromptService::class.java)

    @Transactional(readOnly = true)
    suspend fun getRandomPrompts(count: Int = 3): List<Prompt> {
        return promptRepository.findRandomActive(count)
    }

    @Transactional(readOnly = true)
    suspend fun getUserAnswers(userId: Long): List<UserPromptAnswer> {
        return userPromptAnswerRepository.findAnswersByUserId(userId)
    }

    @Transactional
    suspend fun saveAnswer(userId: Long, promptId: Long, answer: String): UserPromptAnswer {
        val existing = userPromptAnswerRepository.findByUserIdAndPromptId(userId, promptId)
        if (existing != null) {
            existing.answer = answer
            return userPromptAnswerRepository.save(existing)
        }

        val userAnswer = UserPromptAnswer()
        userAnswer.userId = userId
        userAnswer.promptId = promptId
        userAnswer.answer = answer
        userAnswer.createdAt = Timestamp(System.currentTimeMillis())

        return userPromptAnswerRepository.save(userAnswer)
    }

    @Transactional
    suspend fun deleteAnswer(userId: Long, promptId: Long) {
        val answer = userPromptAnswerRepository.findByUserIdAndPromptId(userId, promptId)
        answer?.let { userPromptAnswerRepository.deleteById(it.id!!) }
    }
}
