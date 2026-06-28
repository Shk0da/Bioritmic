package com.github.shk0da.bioritmic.api.configuration

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.JavaMailSenderImpl
import java.util.Properties

@Configuration
class MailConfiguration {

    private val log = LoggerFactory.getLogger(MailConfiguration::class.java)

    @Bean
    @Primary
    fun javaMailSender(
        @Value("\${spring.mail.host:localhost}") host: String,
        @Value("\${spring.mail.port:587}") port: Int,
        @Value("\${spring.mail.username:}") username: String,
        @Value("\${spring.mail.password:}") password: String,
        @Value("\${MAIL_SMTP_AUTH:true}") smtpAuth: String,
        @Value("\${MAIL_STARTTLS_ENABLE:true}") startTlsEnable: String,
        @Value("\${MAIL_STARTTLS_REQUIRED:false}") startTlsRequired: String,
        @Value("\${MAIL_SSL_TRUST:}") mailSslTrust: String,
        @Value("\${MAIL_CONNECTION_TIMEOUT:10000}") connectionTimeout: String,
        @Value("\${MAIL_TIMEOUT:10000}") timeout: String,
        @Value("\${MAIL_WRITE_TIMEOUT:10000}") writeTimeout: String,
    ): JavaMailSender {
        val sender = JavaMailSenderImpl()
        sender.host = host
        sender.port = port
        sender.username = username.ifBlank { null }
        sender.password = password.ifBlank { null }
        sender.defaultEncoding = Charsets.UTF_8.name()

        val props = Properties()
        props["mail.transport.protocol"] = "smtp"
        props["mail.smtp.auth"] = smtpAuth
        props["mail.smtp.starttls.enable"] = startTlsEnable
        props["mail.smtp.starttls.required"] = startTlsRequired
        props["mail.smtp.connectiontimeout"] = connectionTimeout
        props["mail.smtp.timeout"] = timeout
        props["mail.smtp.writetimeout"] = writeTimeout

        if (isInternalDockerMailHost(host)) {
            // docker-mailserver: API connects to hostname "mail" with a different cert CN.
            props["mail.smtp.ssl.trust"] = "*"
            props["mail.smtp.ssl.checkserveridentity"] = "false"
            log.info("JavaMailSender: internal docker SMTP host={}, port={}", host, port)
        } else {
            props["mail.smtp.ssl.trust"] = mailSslTrust.ifBlank { host }
            props["mail.smtp.ssl.checkserveridentity"] = "true"
            log.info("JavaMailSender: external SMTP host={}, port={}", host, port)
        }

        sender.javaMailProperties = props
        return sender
    }

    private fun isInternalDockerMailHost(host: String): Boolean =
        host == "mail" || host == "127.0.0.1" || host == "localhost"
}
