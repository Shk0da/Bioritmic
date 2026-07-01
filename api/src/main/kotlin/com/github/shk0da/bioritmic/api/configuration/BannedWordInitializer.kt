package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.service.BannedWordService
import com.github.shk0da.bioritmic.api.service.ProfanityFilterService
import kotlinx.coroutines.runBlocking
import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

@Component
class BannedWordInitializer(
    private val bannedWordService: BannedWordService,
    private val profanityFilterService: ProfanityFilterService,
) {

    private val log = LoggerFactory.getLogger(BannedWordInitializer::class.java)

    @EventListener(ApplicationReadyEvent::class)
    fun initializeBannedWords() {
        runBlocking {
            val added = bannedWordService.seedDefaultWordsIfEmpty()
            if (added > 0) {
                log.info("Seeded {} default banned word(s)", added)
            }
            profanityFilterService.refreshCache()
        }
    }
}
