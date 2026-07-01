package com.github.shk0da.bioritmic.api.utils

import java.util.Locale

object ProfanityFilter {

    const val MIN_WORD_LENGTH = 2
    const val MAX_WORD_LENGTH = 64

    fun normalizeWord(raw: String): String = raw.trim().lowercase(Locale.ROOT)

    fun escapeIlikePattern(search: String): String {
        return search
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
    }

    fun parseWordsFromText(content: String): List<String> {
        val normalizedContent = content.removePrefix("\uFEFF")
        return normalizedContent.lineSequence()
            .map { it.trim().removePrefix("\uFEFF") }
            .filter { it.isNotEmpty() && !it.startsWith("#") }
            .map(::normalizeWord)
            .filter { it.length in MIN_WORD_LENGTH..MAX_WORD_LENGTH }
            .distinct()
            .toList()
    }

    fun sanitize(text: String, bannedWords: List<String>): String {
        if (text.isEmpty() || bannedWords.isEmpty()) {
            return text
        }
        var result = text
        val sorted = bannedWords
            .asSequence()
            .map(::normalizeWord)
            .filter { it.isNotEmpty() }
            .distinct()
            .sortedByDescending { it.length }
            .toList()
        for (word in sorted) {
            val pattern = Regex("(?iu)(?<![\\p{L}\\p{N}])${Regex.escape(word)}(?![\\p{L}\\p{N}])")
            result = pattern.replace(result) { match -> "*".repeat(match.value.length) }
        }
        return result
    }
}
