package com.github.shk0da.bioritmic.api.utils

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ProfanityFilterTest {

    @Test
    fun `sanitize replaces whole words case-insensitively`() {
        val result = ProfanityFilter.sanitize(
            "Это слово хуй в тексте",
            listOf("хуй"),
        )
        assertEquals("Это слово *** в тексте", result)
    }

    @Test
    fun `sanitize does not replace word parts`() {
        val result = ProfanityFilter.sanitize(
            "подъезд",
            listOf("хуй"),
        )
        assertEquals("подъезд", result)
    }

    @Test
    fun `parseWordsFromText ignores comments and blank lines`() {
        val words = ProfanityFilter.parseWordsFromText(
            """
            # comment
            слово1

            слово2
            """.trimIndent()
        )
        assertEquals(listOf("слово1", "слово2"), words)
    }

    @Test
    fun `parseWordsFromText normalizes and deduplicates`() {
        val words = ProfanityFilter.parseWordsFromText("Слово\nслово\n")
        assertEquals(listOf("слово"), words)
    }

    @Test
    fun `parseWordsFromText strips UTF-8 BOM`() {
        val words = ProfanityFilter.parseWordsFromText("\uFEFFанус")
        assertEquals(listOf("анус"), words)
    }
}
