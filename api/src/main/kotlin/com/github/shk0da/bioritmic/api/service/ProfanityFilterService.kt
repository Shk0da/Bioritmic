package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.repository.BannedWordRepository
import com.github.shk0da.bioritmic.api.utils.ProfanityFilter
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.util.concurrent.atomic.AtomicReference

@Service
class ProfanityFilterService(
    private val bannedWordRepository: BannedWordRepository,
) {

    private val log = LoggerFactory.getLogger(ProfanityFilterService::class.java)
    private val cachedWords = AtomicReference<List<String>>(emptyList())

    @Scheduled(fixedRate = CACHE_REFRESH_MS)
    fun scheduledRefresh() {
        runBlocking { refreshCache() }
    }

    suspend fun refreshCache() {
        val words = bannedWordRepository.findAllWords()
        cachedWords.set(words)
        log.debug("Profanity filter cache refreshed: {} word(s)", words.size)
    }

    fun sanitize(text: String?): String? {
        if (text.isNullOrEmpty()) {
            return text
        }
        return ProfanityFilter.sanitize(text, cachedWords.get())
    }

    companion object {
        private const val CACHE_REFRESH_MS = 300_000L
    }
}
