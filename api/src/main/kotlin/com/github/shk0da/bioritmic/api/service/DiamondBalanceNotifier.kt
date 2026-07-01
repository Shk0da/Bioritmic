package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.service.mailbox.MailboxRealtimeService
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class DiamondBalanceNotifier(
    private val realtimeService: MailboxRealtimeService,
) {

    fun notify(userId: UUID, balance: Long) {
        realtimeService.sendDiamondBalanceEvent(userId, balance)
    }
}
