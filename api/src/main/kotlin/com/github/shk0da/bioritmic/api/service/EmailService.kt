package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.configuration.AppMailProperties
import com.github.shk0da.bioritmic.api.configuration.AppSecurityProperties
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.mail.MailException
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

@Service
class EmailService(
    private val mailSender: JavaMailSender,
    private val mailProperties: AppMailProperties,
    private val appSecurityProperties: AppSecurityProperties
) {

    private val log = LoggerFactory.getLogger(EmailService::class.java)

    @Value("\${app.base-url:http://localhost:8080}")
    private val baseUrl: String = "http://localhost:8080"

    suspend fun sendTextEmail(to: String, subject: String, text: String) {
        if (mailProperties.resolvedMode() == AppMailProperties.MailMode.LOG) {
            log.info("MAIL [log] to={} subject={}\n{}", to, subject, text)
            return
        }

        val message = SimpleMailMessage().apply {
            setFrom(mailProperties.formattedFrom())
            setTo(to)
            setSubject(subject)
            setText(text)
        }

        try {
            withContext(Dispatchers.IO) {
                mailSender.send(message)
            }
            log.info("Email sent to {} subject={}", to, subject)
        } catch (ex: MailException) {
            log.error("Failed to send email to {}: {}", to, ex.message, ex)
            throw ApiException(ErrorCode.API_SERVICE_UNAVAILABLE)
        }
    }

    suspend fun sendNewPassword(email: String, newPassword: String) {
        sendTextEmail(
            email,
            "Новый пароль — Bioritmic",
            "Ваш новый пароль: $newPassword\n\nРекомендуем сменить его после входа в приложение."
        )
    }

    suspend fun sendRecoveryLink(email: String, code: String) {
        val link = "${appSecurityProperties.frontendUrl}/auth/recovery?code=$code"
        sendTextEmail(
            email,
            "Восстановление пароля — Bioritmic",
            "Перейдите по ссылке для сброса пароля:\n$link\n\nКод: $code\n\nСсылка действует 15 минут."
        )
    }

    suspend fun sendConfirmationChangeEmail(email: String, newEmail: String, code: String) {
        val link = "$baseUrl/api/v1/update-email?code=$code&email=$newEmail"
        sendTextEmail(
            email,
            "Подтверждение смены email — Bioritmic",
            "Для подтверждения смены email перейдите по ссылке:\n$link"
        )
    }
}
