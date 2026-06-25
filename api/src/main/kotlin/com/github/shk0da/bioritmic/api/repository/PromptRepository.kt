package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Prompt
import com.github.shk0da.bioritmic.api.domain.UserPromptAnswer
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface PromptRepository : CoroutineCrudRepository<Prompt, Long> {

    @Query("SELECT * FROM prompts WHERE active = true ORDER BY RANDOM() LIMIT :count")
    suspend fun findRandomActive(count: Int): List<Prompt>
}

@Repository
@Transactional(transactionManager = transactionManager)
interface UserPromptAnswerRepository : CoroutineCrudRepository<UserPromptAnswer, Long> {

    @Query(
        "SELECT upa.*, p.text as prompt_text, p.category as prompt_category " +
            "FROM user_prompt_answers upa JOIN prompts p ON upa.prompt_id = p.id " +
            "WHERE upa.user_id = :userId"
    )
    suspend fun findAnswersByUserId(userId: UUID): List<UserPromptAnswer>

    @Query("SELECT * FROM user_prompt_answers WHERE user_id = :userId AND prompt_id = :promptId")
    suspend fun findByUserIdAndPromptId(userId: UUID, promptId: Long): UserPromptAnswer?

    @Modifying
    @Query("DELETE FROM user_prompt_answers WHERE user_id = :userId")
    suspend fun deleteAllByUserId(userId: UUID)
}
