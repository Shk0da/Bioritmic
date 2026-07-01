package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.mailbox.MailReactionType
import com.github.shk0da.bioritmic.api.model.mailbox.MailMediaType
import com.github.shk0da.bioritmic.api.model.mailbox.DiamondMailMessage
import com.github.shk0da.bioritmic.api.model.mailbox.MailSystemMessage
import com.github.shk0da.bioritmic.api.model.mailbox.ConversationPageModel
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.repository.MailboxReactionBatchRepository
import com.github.shk0da.bioritmic.api.repository.MailboxReactionRepository
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.UserBlockRepository
import com.github.shk0da.bioritmic.api.service.mailbox.MailboxRealtimeNotifier
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkFileExtension
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkNotEmpty
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.reactive.awaitSingle
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.domain.Sort.by
import org.springframework.http.codec.multipart.FilePart
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class MailboxService(
    val userService: UserService,
    val mailboxRepository: MailboxRepository,
    val mailboxReactionRepository: MailboxReactionRepository,
    val mailboxReactionBatchRepository: MailboxReactionBatchRepository,
    val userBlockRepository: UserBlockRepository,
    private val pushNotificationService: PushNotificationService,
    private val s3Service: S3Service,
    private val mailboxRealtimeNotifier: MailboxRealtimeNotifier,
    private val profanityFilterService: ProfanityFilterService,
    selfProvider: ObjectProvider<MailboxService>,
) {

    private val log = LoggerFactory.getLogger(MailboxService::class.java)
    private val tx: MailboxService by lazy { selfProvider.getObject() }

    private val defaultPageable = PageableRequest(1, 10, by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun getUserMailbox(userId: UUID, pageable: Pageable): List<UserMail> {
        return mailboxRepository.findAllMailsByUserId(userId, pageable.pageSize, pageable.offset)
            .filter { MailSystemMessage.isVisibleTo(it, userId) }
    }

    suspend fun sendUserMail(userId: UUID, userMailModel: UserMailModel): ConversationPageModel {
        val toUserId = userMailModel.to!!
        val saved = tx.persistUserMail(userId, userMailModel)
        mailboxRealtimeNotifier.onMessagePersisted(saved)
        return tx.getConversationPage(userId, toUserId, beforeId = null, size = CONVERSATION_PAGE_SIZE)
    }

    @Transactional
    suspend fun persistUserMail(userId: UUID, userMailModel: UserMailModel): UserMail {
        val toUserId = userMailModel.to!!
        ensureNotBlocked(userId, toUserId)
        val replyToMessageId = validateReplyTarget(userId, toUserId, userMailModel.replyToMessageId)
        if (userMailModel.message.isNullOrBlank()) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("message" to "message"))
        }

        userMailModel.from = userId
        val sanitizedMessage = profanityFilterService.sanitize(userMailModel.message)
        val userMailWithReply = userMailModel.copy(
            message = sanitizedMessage,
            replyToMessageId = replyToMessageId,
        )
        val userMail = UserMail.of(userMailWithReply)
        val saved = mailboxRepository.save(userMail)
        notifyRecipient(saved, userId)
        return saved
    }

    suspend fun sendMediaMail(
        userId: UUID,
        toUserId: UUID,
        mediaTypeRaw: String,
        file: FilePart,
        caption: String?,
        replyToMessageId: Long?
    ): ConversationPageModel {
        val saved = tx.persistMediaMail(userId, toUserId, mediaTypeRaw, file, caption, replyToMessageId)
        mailboxRealtimeNotifier.onMessagePersisted(saved)
        return tx.getConversationPage(userId, toUserId, beforeId = null, size = CONVERSATION_PAGE_SIZE)
    }

    @Transactional
    suspend fun persistMediaMail(
        userId: UUID,
        toUserId: UUID,
        mediaTypeRaw: String,
        file: FilePart,
        caption: String?,
        replyToMessageId: Long?,
    ): UserMail {
        ensureNotBlocked(userId, toUserId)
        val validatedReplyId = validateReplyTarget(userId, toUserId, replyToMessageId)

        val mediaType = MailMediaType.parse(mediaTypeRaw)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("mediaType" to "mediaType"))

        val filename = file.filename()
        checkNotEmpty(filename, ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))

        val bytes = readFileBytes(file)
        if (bytes.isEmpty()) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("file" to "file"))
        }
        val extension = resolveExtension(filename, mediaType)
        checkFileExtension(filename, allowedExtensions(mediaType), ErrorCode.BAD_PHOTO, mapOf("file" to "file"))
        checkSize(bytes.size, maxBytes(mediaType), ErrorCode.INVALID_PARAMETER)

        val contentType = contentTypeFor(extension, mediaType)
        val folder = mediaFolder(mediaType)
        val s3Key = "mailbox/$folder/$userId/$toUserId/${UUID.randomUUID()}.$extension"

        try {
            s3Service.uploadPhoto(s3Key, bytes, contentType)
        } catch (ex: Exception) {
            log.error("Failed to upload mailbox media to S3", ex)
            throw ApiException(ErrorCode.API_SERVICE_UNAVAILABLE)
        }

        val userMail = UserMail.createMedia(
            fromUserId = userId,
            toUserId = toUserId,
            mediaType = mediaType.name,
            mediaS3Key = s3Key,
            caption = profanityFilterService.sanitize(caption),
            replyToMessageId = validatedReplyId
        )

        return try {
            val saved = mailboxRepository.save(userMail)
            notifyRecipient(saved, userId)
            saved
        } catch (ex: Exception) {
            s3Service.deletePhoto(s3Key)
            throw ex
        }
    }

    @Transactional
    suspend fun deleteMailboxes(currentUserId: UUID, userId: UUID) {
        val messages = mailboxRepository.findAllBetweenUsers(currentUserId, userId)
        messages.mapNotNull { it.mediaS3Key }.forEach { key ->
            s3Service.deletePhoto(key)
        }
        mailboxRepository.deleteAllMailByBetweenTwoUserId(currentUserId, userId)
    }

    @Transactional
    suspend fun deleteOwnMessages(currentUserId: UUID, messageIds: List<Long>): Int {
        val ids = messageIds.distinct()
        if (ids.isEmpty() || ids.size > MAX_DELETE_BATCH_SIZE) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("ids" to "ids"))
        }

        val messages = mailboxRepository.findAllById(ids).toList()
        if (messages.size != ids.size) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("ids" to "ids"))
        }
        if (messages.any { it.fromUserId != currentUserId }) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        if (messages.any { MailSystemMessage.isSystem(it) || DiamondMailMessage.isDiamond(it) }) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }

        messages.mapNotNull { it.mediaS3Key }.distinct().forEach { key ->
            runCatching { s3Service.deletePhoto(key) }
                .onFailure { ex -> log.warn("Failed to delete mailbox media {}: {}", key, ex.message) }
        }

        // Keep replies and show that their source message was deleted.
        mailboxRepository.markReplyTargetsUnavailable(ids)

        val deleted = mailboxRepository.deleteByIdsAndFromUserId(ids, currentUserId)
        if (deleted != ids.size) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        val otherUserIds = messages.mapNotNull { mail ->
            when (currentUserId) {
                mail.fromUserId -> mail.toUserId
                mail.toUserId -> mail.fromUserId
                else -> null
            }
        }.distinct()
        otherUserIds.forEach { otherUserId ->
            mailboxRealtimeNotifier.onMessagesDeleted(currentUserId, otherUserId, ids)
        }
        return deleted
    }

    @Transactional(readOnly = true)
    suspend fun getConversation(currentUserId: UUID, otherUserId: UUID): List<UserMail> {
        return mailboxRepository.findConversationBetweenUsers(currentUserId, otherUserId, currentUserId)
    }

    @Transactional
    suspend fun getConversationModels(
        currentUserId: UUID,
        otherUserId: UUID,
        beforeId: Long?,
        size: Int,
    ): ConversationPageModel {
        return getConversationPage(currentUserId, otherUserId, beforeId, size)
    }

    @Transactional(readOnly = true)
    suspend fun countUnreadSenders(userId: UUID, sinceMs: Long): Long {
        return mailboxRepository.countUnreadSenders(userId, java.sql.Timestamp(sinceMs))
    }

    @Transactional
    suspend fun getConversationPage(
        currentUserId: UUID,
        otherUserId: UUID,
        beforeId: Long?,
        size: Int,
    ): ConversationPageModel {
        val limit = size.coerceIn(1, MAX_CONVERSATION_PAGE_SIZE)
        if (beforeId == null) {
            val unreadIds = mailboxRepository.findUnreadIncomingIds(currentUserId, otherUserId)
            mailboxRepository.markIncomingAsRead(currentUserId, otherUserId)
            if (unreadIds.isNotEmpty()) {
                mailboxRealtimeNotifier.onMessagesRead(currentUserId, otherUserId, unreadIds)
            }
        }

        val visibleMessages = mutableListOf<UserMail>()
        var nextBeforeId = beforeId
        var hasMore = false
        var batchIndex = 0
        val maxSkippedBatches = 20

        while (visibleMessages.size < limit && batchIndex < maxSkippedBatches) {
            batchIndex++
            val rawMessages = if (nextBeforeId == null) {
                mailboxRepository.findLatestConversationMessages(currentUserId, otherUserId, currentUserId, limit)
            } else {
                mailboxRepository.findOlderConversationMessages(
                    currentUserId,
                    otherUserId,
                    currentUserId,
                    nextBeforeId!!,
                    limit,
                )
            }
            if (rawMessages.isEmpty()) {
                hasMore = false
                break
            }

            val batch = rawMessages.reversed()
            val oldestId = batch.firstOrNull()?.id
            hasMore = oldestId?.let { oldest ->
                mailboxRepository.hasOlderConversationMessages(currentUserId, otherUserId, currentUserId, oldest)
            } ?: false

            visibleMessages.addAll(batch.filter { MailSystemMessage.isVisibleTo(it, currentUserId) })

            if (!hasMore || visibleMessages.size >= limit) {
                break
            }
            nextBeforeId = oldestId
        }

        val pageMessages = if (visibleMessages.size > limit) {
            visibleMessages.takeLast(limit)
        } else {
            visibleMessages
        }
        val models = toModelsWithReactions(pageMessages, currentUserId)
        return ConversationPageModel(messages = models, hasMore = hasMore)
    }

    fun toModel(
        userMail: UserMail,
        currentUserReaction: String? = null,
        reactionCounts: Map<String, Int> = emptyMap()
    ): UserMailModel {
        val mediaUrl = userMail.mediaS3Key?.let { s3Service.getPhotoUrl(it) }
        return UserMailModel.of(userMail, mediaUrl, currentUserReaction, reactionCounts)
    }

    private suspend fun toModelsWithReactions(messages: List<UserMail>, currentUserId: UUID): List<UserMailModel> {
        val messageIds = messages.mapNotNull { it.id }
        val reactionsByUser = mailboxReactionBatchRepository.findReactionsByMailIdsAndUserId(messageIds, currentUserId)
        val reactionCounts = mailboxReactionBatchRepository.countReactionsByMailIds(messageIds)
        return messages.map { message ->
            val messageId = message.id
            val currentReaction = if (messageId != null) reactionsByUser[messageId] else null
            val counts = if (messageId != null) reactionCounts[messageId] ?: emptyMap() else emptyMap()
            toModel(message, currentReaction, counts)
        }
    }

    private suspend fun ensureNotBlocked(userId: UUID, otherUserId: UUID) {
        val user = userService.findUserById(otherUserId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val block = userBlockRepository.findByUserIdAndOtherUserId(user.id!!, userId)
        if (block != null) {
            throw ApiException(ErrorCode.USER_IS_BLOCKED)
        }
    }

    @Transactional(transactionManager = com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager)
    suspend fun reactToMessage(messageId: Long, userId: UUID, reaction: String): Map<String, Any?> {
        val message = mailboxRepository.findById(messageId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("messageId" to "messageId"))
        val from = message.fromUserId ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("messageId" to "messageId"))
        val to = message.toUserId ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("messageId" to "messageId"))
        if (userId != from && userId != to) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }

        val reactionType = MailReactionType.parse(reaction)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("reaction" to "reaction"))
        val existing = mailboxReactionRepository.findReaction(messageId, userId)
        if (existing == reactionType.name) {
            mailboxReactionRepository.deleteReaction(messageId, userId)
            val counts = mailboxReactionBatchRepository
                .countReactionsByMailIdsFromMaster(listOf(messageId))[messageId] ?: emptyMap()
            val otherUserId = if (userId == from) to else from
            mailboxRealtimeNotifier.onReactionUpdated(userId, otherUserId, messageId, null, counts)
            return mapOf("reaction" to null, "reactionCounts" to counts)
        }
        mailboxReactionRepository.upsert(messageId, userId, reactionType.name)
        val counts = mailboxReactionBatchRepository
            .countReactionsByMailIdsFromMaster(listOf(messageId))[messageId] ?: emptyMap()
        val otherUserId = if (userId == from) to else from
        mailboxRealtimeNotifier.onReactionUpdated(userId, otherUserId, messageId, reactionType.name, counts)
        return mapOf("reaction" to reactionType.name, "reactionCounts" to counts)
    }

    private suspend fun validateReplyTarget(userId: UUID, otherUserId: UUID, replyToMessageId: Long?): Long? {
        if (replyToMessageId == null) return null
        val targetMessage = mailboxRepository.findById(replyToMessageId)
            ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("replyToMessageId" to "replyToMessageId"))
        val from = targetMessage.fromUserId
        val to = targetMessage.toUserId
        val sameConversation = (from == userId && to == otherUserId) || (from == otherUserId && to == userId)
        if (!sameConversation) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("replyToMessageId" to "replyToMessageId"))
        }
        if (MailSystemMessage.isSystem(targetMessage) || DiamondMailMessage.isDiamond(targetMessage)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("replyToMessageId" to "replyToMessageId"))
        }
        return replyToMessageId
    }

    private suspend fun notifyRecipient(userMail: UserMail, senderId: UUID) {
        val sender = userService.findUserById(senderId)
        val senderName = sender?.name?.takeIf { it.isNotBlank() } ?: "Пользователь"
        val preview = pushPreview(userMail)
        pushNotificationService.notifyNewMessage(userMail.toUserId!!, senderId, senderName, preview)
    }

    private fun pushPreview(userMail: UserMail): String {
        if (!userMail.message.isNullOrBlank()) {
            return userMail.message!!
        }
        return when (userMail.mediaType) {
            MailMediaType.VOICE.name -> "Голосовое сообщение"
            MailMediaType.PHOTO.name -> "Фото"
            MailMediaType.VIDEO_NOTE.name -> "Видео-кружок"
            MailMediaType.VIDEO_NOTE.name -> "Видео-кружок"
            MailMediaType.DIAMOND.name -> "Перевод алмазов"
            else -> "Новое сообщение"
        }
    }

    private suspend fun readFileBytes(file: FilePart): ByteArray = withContext(Dispatchers.IO) {
        file.content().reduce { buffer1, buffer2 ->
            buffer1.write(buffer2)
            buffer1
        }.awaitSingle().asInputStream().use { it.readAllBytes() }
    }

    private fun allowedExtensions(mediaType: MailMediaType): List<String> = when (mediaType) {
        MailMediaType.VOICE -> listOf("webm", "ogg", "mp4", "m4a")
        MailMediaType.PHOTO -> listOf("png", "jpg", "jpeg", "webp")
        MailMediaType.VIDEO_NOTE -> listOf("webm", "mp4")
        MailMediaType.SYSTEM, MailMediaType.DIAMOND -> emptyList()
    }

    private fun maxBytes(mediaType: MailMediaType): Int = when (mediaType) {
        MailMediaType.VOICE -> MAX_VOICE_BYTES
        MailMediaType.PHOTO -> MAX_PHOTO_BYTES
        MailMediaType.VIDEO_NOTE -> MAX_VIDEO_BYTES
        MailMediaType.SYSTEM, MailMediaType.DIAMOND -> 0
    }

    private fun resolveExtension(filename: String, mediaType: MailMediaType): String {
        val ext = filename.substringAfterLast('.', "").lowercase()
        if (ext.isNotBlank() && allowedExtensions(mediaType).contains(ext)) {
            return ext
        }
        return when (mediaType) {
            MailMediaType.VOICE -> "webm"
            MailMediaType.PHOTO -> "jpg"
            MailMediaType.VIDEO_NOTE -> "webm"
            MailMediaType.SYSTEM, MailMediaType.DIAMOND -> "txt"
        }
    }

    private fun mediaFolder(mediaType: MailMediaType): String = when (mediaType) {
        MailMediaType.VOICE -> "voice"
        MailMediaType.PHOTO -> "photo"
        MailMediaType.VIDEO_NOTE -> "video"
        MailMediaType.SYSTEM, MailMediaType.DIAMOND -> "system"
    }

    private fun contentTypeFor(extension: String, mediaType: MailMediaType): String = when (extension) {
        "png" -> "image/png"
        "webp" -> "image/webp"
        "jpg", "jpeg" -> "image/jpeg"
        "ogg" -> "audio/ogg"
        "m4a" -> "audio/mp4"
        "mp4" -> if (mediaType == MailMediaType.VOICE) "audio/mp4" else "video/mp4"
        else -> if (mediaType == MailMediaType.VOICE) "audio/webm" else "video/webm"
    }

    companion object {
        const val CONVERSATION_PAGE_SIZE = 30
        private const val MAX_CONVERSATION_PAGE_SIZE = 100
        private const val MAX_DELETE_BATCH_SIZE = 100
        private const val MAX_VOICE_BYTES = 50 * 1024 * 1024
        private const val MAX_PHOTO_BYTES = 10 * 1024 * 1024
        private const val MAX_VIDEO_BYTES = 50 * 1024 * 1024
    }
}
