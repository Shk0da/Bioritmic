package com.github.shk0da.bioritmic.api.configuration

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.mail")
data class AppMailProperties(
    val from: String = "noreply@bioritmic.ru",
    val fromName: String = "Bioritmic",
    /** `smtp` — отправка через JavaMailSender; `log` — только лог (тесты). */
    val mode: String = "smtp"
) {
    enum class MailMode {
        SMTP,
        LOG
    }

    fun resolvedMode(): MailMode = when (mode.lowercase()) {
        "log" -> MailMode.LOG
        else -> MailMode.SMTP
    }

    fun formattedFrom(): String {
        return if (fromName.isBlank()) {
            from
        } else {
            "$fromName <$from>"
        }
    }
}
