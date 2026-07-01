package com.github.shk0da.bioritmic.api.service.mailbox

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.model.mailbox.MailboxWsInbound
import com.github.shk0da.bioritmic.api.model.mailbox.MailboxWsOutbound
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.reactive.socket.WebSocketMessage
import org.springframework.web.reactive.socket.WebSocketSession
import reactor.core.publisher.Flux
import reactor.core.publisher.Sinks
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

@Service
class MailboxRealtimeService(
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(MailboxRealtimeService::class.java)
    private val connectionsByUser = ConcurrentHashMap<UUID, MutableSet<MailboxWsConnection>>()

    fun register(userId: UUID, session: WebSocketSession): MailboxWsConnection {
        val sink = Sinks.many().multicast().onBackpressureBuffer<WebSocketMessage>()
        val connection = MailboxWsConnection(userId, session, sink)
        connectionsByUser.computeIfAbsent(userId) { ConcurrentHashMap.newKeySet() }.add(connection)
        return connection
    }

    fun unregister(connection: MailboxWsConnection) {
        connection.sink.tryEmitComplete()
        connectionsByUser[connection.userId]?.remove(connection)
        if (connectionsByUser[connection.userId].isNullOrEmpty()) {
            connectionsByUser.remove(connection.userId)
        }
    }

    fun handleInbound(connection: MailboxWsConnection, payload: String) {
        val inbound = runCatching {
            objectMapper.readValue(payload, MailboxWsInbound::class.java)
        }.getOrElse {
            log.debug("Invalid mailbox WS payload from {}: {}", connection.userId, payload)
            send(connection, MailboxWsOutbound(type = "error"))
            return
        }

        when (inbound.action.lowercase()) {
            ACTION_SUBSCRIBE -> {
                val otherUserId = inbound.otherUserId
                if (otherUserId == null) {
                    send(connection, MailboxWsOutbound(type = "error"))
                    return
                }
                connection.subscribedOtherUserId = otherUserId
                send(connection, MailboxWsOutbound(type = "subscribed", otherUserId = otherUserId))
            }
            ACTION_UNSUBSCRIBE -> {
                connection.subscribedOtherUserId = null
                send(connection, MailboxWsOutbound(type = "unsubscribed"))
            }
            ACTION_PING -> send(connection, MailboxWsOutbound(type = "pong"))
            else -> send(connection, MailboxWsOutbound(type = "error"))
        }
    }

    fun sendMessageEvent(viewerUserId: UUID, otherUserId: UUID, message: UserMailModel) {
        dispatch(viewerUserId, otherUserId) {
            MailboxWsOutbound(type = TYPE_MESSAGE, otherUserId = otherUserId, message = message)
        }
    }

    fun sendDeletedEvent(viewerUserId: UUID, otherUserId: UUID, messageIds: List<Long>) {
        if (messageIds.isEmpty()) {
            return
        }
        dispatch(viewerUserId, otherUserId) {
            MailboxWsOutbound(type = TYPE_DELETED, otherUserId = otherUserId, messageIds = messageIds)
        }
    }

    fun sendReactionEvent(
        viewerUserId: UUID,
        otherUserId: UUID,
        messageId: Long,
        reaction: String?,
        reactionCounts: Map<String, Int>,
    ) {
        dispatch(viewerUserId, otherUserId) {
            MailboxWsOutbound(
                type = TYPE_REACTION,
                otherUserId = otherUserId,
                messageId = messageId,
                reaction = reaction,
                reactionCounts = reactionCounts,
            )
        }
    }

    fun sendReadEvent(viewerUserId: UUID, otherUserId: UUID, messageIds: List<Long>) {
        if (messageIds.isEmpty()) {
            return
        }
        dispatch(viewerUserId, otherUserId) {
            MailboxWsOutbound(type = TYPE_READ, otherUserId = otherUserId, messageIds = messageIds)
        }
    }

    fun sendDiamondBalanceEvent(userId: UUID, balance: Long) {
        val connections = connectionsByUser[userId] ?: return
        val event = MailboxWsOutbound(type = TYPE_DIAMOND_BALANCE, balance = balance)
        connections.forEach { connection ->
            send(connection, event)
        }
    }

    private inline fun dispatch(
        viewerUserId: UUID,
        otherUserId: UUID,
        eventFactory: () -> MailboxWsOutbound,
    ) {
        val connections = connectionsByUser[viewerUserId] ?: return
        val event = eventFactory()
        connections.forEach { connection ->
            if (connection.subscribedOtherUserId == otherUserId) {
                send(connection, event)
            }
        }
    }

    private fun send(connection: MailboxWsConnection, outbound: MailboxWsOutbound) {
        val json = objectMapper.writeValueAsString(outbound)
        connection.sink.tryEmitNext(connection.session.textMessage(json))
    }

    class MailboxWsConnection(
        val userId: UUID,
        val session: WebSocketSession,
        val sink: Sinks.Many<WebSocketMessage>,
        var subscribedOtherUserId: UUID? = null,
    ) {
        fun outbound(): Flux<WebSocketMessage> = sink.asFlux()
    }

    companion object {
        const val ACTION_SUBSCRIBE = "subscribe"
        const val ACTION_UNSUBSCRIBE = "unsubscribe"
        const val ACTION_PING = "ping"
        const val TYPE_MESSAGE = "message"
        const val TYPE_DELETED = "deleted"
        const val TYPE_REACTION = "reaction"
        const val TYPE_READ = "read"
        const val TYPE_DIAMOND_BALANCE = "diamond_balance"
    }
}
