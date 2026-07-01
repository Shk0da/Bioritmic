package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.BannedWord
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface BannedWordRepository : CoroutineCrudRepository<BannedWord, Long> {

    @Transactional(readOnly = true)
    @Query("SELECT word FROM banned_words ORDER BY length(word) DESC, word ASC")
    suspend fun findAllWords(): List<String>

    @Transactional(readOnly = true)
    @Query("SELECT COUNT(*) FROM banned_words")
    suspend fun countAll(): Long

    @Transactional(readOnly = true)
    @Query(
        """
        SELECT * FROM banned_words
        WHERE (:search = '' OR word ILIKE '%' || :search || '%' ESCAPE '\')
        ORDER BY word ASC
        LIMIT :limit OFFSET :offset
        """
    )
    suspend fun findPage(search: String, limit: Int, offset: Long): List<BannedWord>

    @Transactional(readOnly = true)
    @Query(
        """
        SELECT COUNT(*) FROM banned_words
        WHERE (:search = '' OR word ILIKE '%' || :search || '%' ESCAPE '\')
        """
    )
    suspend fun countBySearch(search: String): Long

    @Transactional(readOnly = true)
    suspend fun existsByWord(word: String): Boolean

    @Modifying
    @Query("DELETE FROM banned_words")
    suspend fun deleteAllWords()
}
