package com.github.shk0da.bioritmic.api.configuration

import org.springframework.beans.factory.config.BeanPostProcessor
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.mail.javamail.JavaMailSenderImpl
import java.util.Properties

@Configuration
class MailConfiguration {

    @Bean
    fun javaMailSenderSslTrustCustomizer(
        @Value("\${spring.mail.host:localhost}") mailHost: String,
        @Value("\${MAIL_SSL_TRUST:}") mailSslTrust: String,
    ): BeanPostProcessor = object : BeanPostProcessor {
        override fun postProcessAfterInitialization(bean: Any, beanName: String): Any {
            if (bean !is JavaMailSenderImpl) {
                return bean
            }

            val props = Properties()
            props.putAll(bean.javaMailProperties)
            props["mail.smtp.ssl.trust"] = buildSslTrust(mailHost, mailSslTrust)
            props["mail.smtp.ssl.checkserveridentity"] = "false"
            bean.javaMailProperties = props
            return bean
        }
    }

    private fun buildSslTrust(mailHost: String, configured: String): String {
        val hosts = linkedSetOf(mailHost, "mail", "mail.bioritmic.ru", "localhost")
        if (configured.isNotBlank()) {
            configured.split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .forEach { hosts.add(it) }
        }
        return hosts.joinToString(",")
    }
}
