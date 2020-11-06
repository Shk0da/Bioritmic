package com.github.shk0da.bioritmic.api.service

import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

@Service
class EmailService(val mailSender: JavaMailSender) {

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
}