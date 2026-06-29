package com.github.shk0da.bioritmic.api.model.mailbox

enum class MailMediaType {
    VOICE,
    PHOTO,
    VIDEO_NOTE;

    companion object {
        fun parse(value: String): MailMediaType? =
            entries.find { it.name.equals(value.trim(), ignoreCase = true) }
    }
}
