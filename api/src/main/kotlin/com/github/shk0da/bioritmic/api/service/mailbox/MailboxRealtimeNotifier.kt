package com.github.shk0da.bioritmic.api.service.mailbox

import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.model.mailbox.MailSystemMessage
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.repository.MailboxReactionBatchRepository
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.service.S3Service
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class MailboxRealtimeNotifier(
    private val s3Service: S3Service,
    private val mailboxRepository: MailboxRepository,
    private val mailboxReactionBatchRepository: MailboxReactionBatchRepository,
    private val realtimeService: MailboxRealtimeService,
) {

    suspend fun onMessagePersisted(mail: UserMail) {
        val messageId = mail.id ?: return
        val from = mail.fromUserId ?: return
        val to = mail.toUserId ?: return
        val fresh = mailboxRepository.findById(messageId) ?: return
        if (MailSystemMessage.isSystem(fresh)) {
            publishMessageToParticipant(fresh, to, from)
            return
        }
        publishMessageToParticipant(fresh, to, from)
        publishMessageToParticipant(fresh, from, to)
    }

    suspend fun onMessagesDeleted(deleterId: UUID, otherUserId: UUID, messageIds: List<Long>) {
        realtimeService.sendDeletedEvent(deleterId, otherUserId, messageIds)
        realtimeService.sendDeletedEvent(otherUserId, deleterId, messageIds)
    }

    suspend fun onReactionUpdated(
        actorUserId: UUID,
        otherUserId: UUID,
        messageId: Long,
        actorReaction: String?,
        reactionCounts: Map<String, Int>,
    ) {
        realtimeService.sendReactionEvent(actorUserId, otherUserId, messageId, actorReaction, reactionCounts)
        val otherViewerReaction = mailboxReactionBatchRepository
            .findReactionsByMailIdsAndUserId(listOf(messageId), otherUserId)[messageId]
        realtimeService.sendReactionEvent(otherUserId, actorUserId, messageId, otherViewerReaction, reactionCounts)
    }

    suspend fun onMessagesRead(readerId: UUID, senderId: UUID, messageIds: List<Long>) {
        realtimeService.sendReadEvent(senderId, readerId, messageIds)
    }

    private suspend fun publishMessageToParticipant(mail: UserMail, viewerUserId: UUID, otherUserId: UUID) {
        val messageId = mail.id ?: return
        val currentReaction = mailboxReactionBatchRepository
            .findReactionsByMailIdsAndUserId(listOf(messageId), viewerUserId)[messageId]
        val reactionCounts = mailboxReactionBatchRepository
            .countReactionsByMailIds(listOf(messageId))[messageId] ?: emptyMap()
        val model = UserMailModel.of(
            mail,
            mail.mediaS3Key?.let { s3Service.getPhotoUrl(it) },
            currentReaction,
            reactionCounts,
        )
        realtimeService.sendMessageEvent(viewerUserId, otherUserId, model)
    }
}
