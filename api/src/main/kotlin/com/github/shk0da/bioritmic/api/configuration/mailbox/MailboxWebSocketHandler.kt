package com.github.shk0da.bioritmic.api.configuration.mailbox

import com.github.shk0da.bioritmic.api.service.AuthService
import com.github.shk0da.bioritmic.api.service.DiamondBalanceNotifier
import com.github.shk0da.bioritmic.api.service.DiamondService
import com.github.shk0da.bioritmic.api.service.mailbox.MailboxRealtimeService
import com.github.shk0da.bioritmic.api.utils.AuthCookieHelper
import kotlinx.coroutines.reactor.mono
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import org.springframework.web.reactive.socket.CloseStatus
import org.springframework.web.reactive.socket.HandshakeInfo
import org.springframework.web.reactive.socket.WebSocketHandler
import org.springframework.web.reactive.socket.WebSocketSession
import reactor.core.publisher.Mono
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.UUID

@Component
class MailboxWebSocketHandler(
    private val authService: AuthService,
    private val realtimeService: MailboxRealtimeService,
    private val diamondService: DiamondService,
    private val diamondBalanceNotifier: DiamondBalanceNotifier,
) : WebSocketHandler {

    override fun handle(session: WebSocketSession): Mono<Void> {
        return mono {
            authenticate(session.handshakeInfo)
        }.flatMap { userId: UUID? ->
            if (userId == null) {
                return@flatMap session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Unauthorized"))
            }
            val connection = realtimeService.register(userId, session)
            val inbound = session.receive()
                .doOnNext { message ->
                    if (message.type == org.springframework.web.reactive.socket.WebSocketMessage.Type.TEXT) {
                        realtimeService.handleInbound(connection, message.payloadAsText)
                    }
                }
                .doFinally { realtimeService.unregister(connection) }
                .then()
            val outbound = session.send(connection.outbound())
            mono {
                diamondBalanceNotifier.notify(userId, diamondService.getBalance(userId))
            }
                .then(Mono.`when`(inbound, outbound))
                .then()
        }
    }

    private suspend fun authenticate(handshake: HandshakeInfo): UUID? {
        val token = extractAccessToken(handshake) ?: return null
        val auth = authService.getAuthByAccessToken(token) ?: return null
        if (auth.isExpired()) {
            return null
        }
        return auth.userId
    }

    private fun extractAccessToken(handshake: HandshakeInfo): String? {
        handshake.cookies.getFirst(AuthCookieHelper.ACCESS_TOKEN)?.value?.let { return it }
        handshake.uri.query?.split("&")?.forEach { part ->
            val pieces = part.split("=", limit = 2)
            if (pieces.size == 2 && pieces[0] == "access_token" && pieces[1].isNotBlank()) {
                return URLDecoder.decode(pieces[1], StandardCharsets.UTF_8)
            }
        }
        val bearer = "Bearer "
        val header = handshake.headers.getFirst(HttpHeaders.AUTHORIZATION) ?: return null
        if (header.length > bearer.length && header.startsWith(bearer)) {
            return header.substring(bearer.length)
        }
        return null
    }
}
