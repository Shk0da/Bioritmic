package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.BannedWord
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.repository.BannedWordRepository
import com.github.shk0da.bioritmic.api.utils.ProfanityFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.reactive.awaitSingle
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.core.io.buffer.DataBufferUtils
import org.springframework.dao.DuplicateKeyException
import org.springframework.http.codec.multipart.FilePart
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.charset.StandardCharsets
import java.sql.Timestamp

@Service
class BannedWordService(
    private val bannedWordRepository: BannedWordRepository,
) {

    private val log = LoggerFactory.getLogger(BannedWordService::class.java)

    @Transactional(readOnly = true, transactionManager = transactionManager)
    suspend fun listWords(search: String?, page: Int, size: Int): BannedWordPage {
        val safeSize = size.coerceIn(1, MAX_PAGE_SIZE)
        val safePage = page.coerceAtLeast(0)
        val normalizedSearch = ProfanityFilter.escapeIlikePattern(
            ProfanityFilter.normalizeWord(search.orEmpty())
        )
        val items = bannedWordRepository.findPage(normalizedSearch, safeSize, safePage.toLong() * safeSize)
        val total = bannedWordRepository.countBySearch(normalizedSearch)
        return BannedWordPage(
            items = items.map { BannedWordItem(it.id!!, it.word!!, it.createdAt) },
            total = total,
            page = safePage,
            size = safeSize,
        )
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun addWord(rawWord: String): BannedWordItem {
        val word = validateWord(rawWord)
        if (bannedWordRepository.existsByWord(word)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("word" to "exists"))
        }
        return try {
            val saved = bannedWordRepository.save(
                BannedWord().apply {
                    this.word = word
                    this.createdAt = Timestamp(System.currentTimeMillis())
                }
            )
            BannedWordItem(saved.id!!, saved.word!!, saved.createdAt)
        } catch (ex: DuplicateKeyException) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("word" to "exists"))
        }
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun deleteWord(id: Long) {
        if (!bannedWordRepository.existsById(id)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("id" to "id"))
        }
        bannedWordRepository.deleteById(id)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun importFromText(content: String, mode: ImportMode): BannedWordImportResult {
        val words = ProfanityFilter.parseWordsFromText(content)
        if (words.isEmpty()) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "empty"))
        }
        if (words.size > MAX_IMPORT_WORDS) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "too_many"))
        }
        return importWords(words, mode)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun importFromFile(file: FilePart, mode: ImportMode): BannedWordImportResult {
        val filename = file.filename().lowercase()
        if (filename.isBlank() || !filename.endsWith(".txt")) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "format"))
        }
        val bytes = readFileBytes(file)
        if (bytes.isEmpty()) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "empty"))
        }
        if (bytes.size > MAX_IMPORT_FILE_BYTES) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "size"))
        }
        val content = String(bytes, StandardCharsets.UTF_8)
        return importFromText(content, mode)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun seedDefaultWordsIfEmpty(): Int {
        if (bannedWordRepository.countAll() > 0) {
            return 0
        }
        val stream = javaClass.classLoader.getResourceAsStream(DEFAULT_WORDS_RESOURCE)
        if (stream == null) {
            log.warn("Default banned words resource is missing: {}", DEFAULT_WORDS_RESOURCE)
            return 0
        }
        val content = stream.bufferedReader(StandardCharsets.UTF_8).use { it.readText() }
        return importWords(ProfanityFilter.parseWordsFromText(content), ImportMode.APPEND).added
    }

    private suspend fun importWords(words: List<String>, mode: ImportMode): BannedWordImportResult {
        if (mode == ImportMode.REPLACE) {
            bannedWordRepository.deleteAllWords()
        }
        var added = 0
        var skipped = 0
        for (word in words) {
            if (bannedWordRepository.existsByWord(word)) {
                skipped++
                continue
            }
            try {
                bannedWordRepository.save(
                    BannedWord().apply {
                        this.word = word
                        this.createdAt = Timestamp(System.currentTimeMillis())
                    }
                )
                added++
            } catch (ex: DuplicateKeyException) {
                skipped++
            }
        }
        return BannedWordImportResult(
            added = added,
            skipped = skipped,
            total = words.size,
            mode = mode.name,
        )
    }

    private fun validateWord(rawWord: String): String {
        val word = ProfanityFilter.normalizeWord(rawWord)
        if (word.length !in ProfanityFilter.MIN_WORD_LENGTH..ProfanityFilter.MAX_WORD_LENGTH) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("word" to "word"))
        }
        return word
    }

    private suspend fun readFileBytes(file: FilePart): ByteArray = withContext(Dispatchers.IO) {
        val buffer = DataBufferUtils.join(file.content()).awaitSingle()
        ByteArray(buffer.readableByteCount()).also { bytes ->
            buffer.read(bytes)
            DataBufferUtils.release(buffer)
        }
    }

    companion object {
        private const val MAX_PAGE_SIZE = 200
        private const val MAX_IMPORT_WORDS = 10_000
        private const val MAX_IMPORT_FILE_BYTES = 1_048_576
        private const val DEFAULT_WORDS_RESOURCE = "profanity/default-banned-words.txt"
    }
}

enum class ImportMode {
    APPEND,
    REPLACE,
}

data class BannedWordItem(
    val id: Long,
    val word: String,
    val createdAt: Timestamp?,
)

data class BannedWordPage(
    val items: List<BannedWordItem>,
    val total: Long,
    val page: Int,
    val size: Int,
)

data class BannedWordImportResult(
    val added: Int,
    val skipped: Int,
    val total: Int,
    val mode: String,
)
