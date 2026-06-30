package com.github.shk0da.bioritmic.api.model.story

enum class StoryReactionType {
    LIKE,
    HEART,
    FIRE,
    POOP,
    CLOWN,
    LOL,
    CRY;

    companion object {
        fun parse(value: String): StoryReactionType? =
            entries.firstOrNull { it.name.equals(value.trim(), ignoreCase = true) }
    }
}
