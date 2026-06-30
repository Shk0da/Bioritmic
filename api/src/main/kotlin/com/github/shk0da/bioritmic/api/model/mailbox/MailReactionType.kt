package com.github.shk0da.bioritmic.api.model.mailbox

enum class MailReactionType {
    LIKE,
    HEART,
    FIRE,
    POOP,
    CLOWN,
    LOL,
    CRY;

    companion object {
        fun parse(value: String): MailReactionType? =
            entries.firstOrNull { it.name.equals(value.trim(), ignoreCase = true) }
    }
}
