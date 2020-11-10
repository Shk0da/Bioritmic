package com.github.shk0da.bioritmic.api.service

import org.slf4j.LoggerFactory
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

@Service
class EmailService(val mailSender: JavaMailSender) {

    private val log = LoggerFactory.getLogger(EmailService::class.java)

    companion object {
        const val DEFAULT_FROM = "admin@bioritmic.com"
    }

    fun sendTextEmail(to: String, subject: String, text: String) {
        val message = SimpleMailMessage()
        message.setFrom(DEFAULT_FROM)
        message.setTo(to)
        message.setSubject(subject)
        message.setText(text)
        mailSender.send(message)
    }

    fun sendNewPassword(email: String, newPassword: String) {
        log.debug("Send new password: '{}' for {}", newPassword, email)
        sendTextEmail(email, "New password", newPassword)
    }

    fun sendRecoveryLink(email: String, code: String) {
        val link = "http://localhost:8080/api/v1/reset-password?code=$code"
        log.debug("Send recovery link: '{}' for {}", link, email)
        sendTextEmail(email, "Reset password", link)
    }

    fun sendConfirmationChangeEmail(email: String, newEmail: String, code: String) {
        val link = "http://localhost:8080/api/v1/update-email?code=$code&email=$newEmail"
        log.debug("Send change email link: '{}' for {}", link, email)
        sendTextEmail(email, "Confirmation change email", link)
    }
}