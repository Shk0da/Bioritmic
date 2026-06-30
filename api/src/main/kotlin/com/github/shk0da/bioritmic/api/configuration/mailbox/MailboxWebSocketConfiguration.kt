package com.github.shk0da.bioritmic.api.configuration.mailbox

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.reactive.HandlerMapping
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping
import org.springframework.web.reactive.socket.WebSocketHandler
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter

@Configuration
class MailboxWebSocketConfiguration {

    @Bean
    fun mailboxWebSocketHandlerMapping(handler: MailboxWebSocketHandler): HandlerMapping {
        val path = "${ApiRoutes.API_WITH_VERSION_1}/ws/mailbox"
        val map = mapOf<String, WebSocketHandler>(path to handler)
        return SimpleUrlHandlerMapping(map, -1)
    }

    @Bean
    fun mailboxWebSocketHandlerAdapter(): WebSocketHandlerAdapter = WebSocketHandlerAdapter()
}
