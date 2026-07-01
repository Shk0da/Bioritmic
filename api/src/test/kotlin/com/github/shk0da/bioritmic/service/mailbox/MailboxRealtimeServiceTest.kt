package com.github.shk0da.bioritmic.service.mailbox

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.github.shk0da.bioritmic.api.service.mailbox.MailboxRealtimeService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.web.reactive.socket.WebSocketMessage
import org.springframework.web.reactive.socket.WebSocketSession
import org.mockito.Mockito
import java.util.UUID

class MailboxRealtimeServiceTest {

    private val objectMapper: ObjectMapper = jacksonObjectMapper()
    private val service = MailboxRealtimeService(objectMapper)
    private lateinit var session: WebSocketSession

    @BeforeEach
    fun setUp() {
        session = Mockito.mock(WebSocketSession::class.java)
        val frame = Mockito.mock(WebSocketMessage::class.java)
        Mockito.`when`(session.textMessage(Mockito.anyString())).thenReturn(frame)
    }

    @Test
    fun `subscribe stores other user id`() {
        val userId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()
        val connection = service.register(userId, session)

        service.handleInbound(connection, """{"action":"subscribe","otherUserId":"$otherUserId"}""")

        assertEquals(otherUserId, connection.subscribedOtherUserId)
    }

    @Test
    fun `unsubscribe clears other user id`() {
        val userId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()
        val connection = service.register(userId, session)
        connection.subscribedOtherUserId = otherUserId

        service.handleInbound(connection, """{"action":"unsubscribe"}""")

        assertEquals(null, connection.subscribedOtherUserId)
    }

    @Test
    fun `subscribe without other user id keeps previous subscription`() {
        val userId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()
        val connection = service.register(userId, session)
        connection.subscribedOtherUserId = otherUserId

        service.handleInbound(connection, """{"action":"subscribe"}""")

        assertEquals(otherUserId, connection.subscribedOtherUserId)
    }

    @Test
    fun `diamond balance event is sent to all user connections`() {
        val userId = UUID.randomUUID()
        val connection = service.register(userId, session)
        val captured = mutableListOf<String>()
        Mockito.`when`(session.textMessage(Mockito.anyString())).thenAnswer { invocation ->
            captured.add(invocation.getArgument(0))
            Mockito.mock(WebSocketMessage::class.java)
        }

        service.sendDiamondBalanceEvent(userId, 42)

        assertEquals(1, captured.size)
        assertEquals(true, captured[0].contains("\"type\":\"diamond_balance\""))
        assertEquals(true, captured[0].contains("\"balance\":42"))
        service.unregister(connection)
    }
}
