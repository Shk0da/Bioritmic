package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Meeting
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.mailbox.MailSystemMessage
import com.github.shk0da.bioritmic.api.model.mailbox.MeetingSystemMailMessages
import com.github.shk0da.bioritmic.api.model.user.MeetingLimitResponse
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.MeetingStatusUpdater
import com.github.shk0da.bioritmic.api.repository.MeetingsRepository
import com.github.shk0da.bioritmic.api.service.mailbox.MailboxRealtimeNotifier
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import kotlinx.coroutines.reactive.awaitFirstOrNull
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.data.domain.Sort
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

@Service
class MeetingsService(
    val meetingsRepository: MeetingsRepository,
    val meetingStatusUpdater: MeetingStatusUpdater,
    val mailboxRepository: MailboxRepository,
    val databaseClient: DatabaseClient,
    private val userService: UserService,
    private val pushNotificationService: PushNotificationService,
    private val mailboxRealtimeNotifier: MailboxRealtimeNotifier,
    private val profanityFilterService: ProfanityFilterService,
    private val userVerificationService: UserVerificationService,
) {

    private val log = LoggerFactory.getLogger(MeetingsService::class.java)

    private val defaultPageable = PageableRequest(1, MAX_MEETINGS, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun findAllMeetingsByUserId(userId: UUID, pageable: PageableRequest): List<Meeting> {
        val incoming = meetingsRepository.findIncomingByUserId(userId, pageable.pageSize, pageable.offset)
        val acceptedOutgoing = meetingsRepository.findSentAcceptedByUserId(userId, pageable.pageSize, pageable.offset)
        val pendingOutgoing = meetingsRepository.findSentPendingByUserId(userId, pageable.pageSize, pageable.offset)
        val seen = mutableSetOf<Pair<UUID?, UUID?>>()
        return (incoming + acceptedOutgoing + pendingOutgoing)
            .filter { meeting ->
                val key = meeting.userId to meeting.otherUserId
                seen.add(key)
            }
            .sortedByDescending { it.timestamp?.time ?: 0L }
    }

    @Transactional
    suspend fun createMeetings(userId: UUID, meetings: List<UserMeeting>): List<Meeting> {
        userVerificationService.requireVerified(userId)
        val meetingList = meetings.filter { it.isFilledInput() && it.userId != userId }
        val newMeetings = meetingList.filter { meeting ->
            val otherUserId = meeting.userId ?: return@filter false
            !meetingsRepository.existsByUserIdAndOtherUserId(userId, otherUserId)
        }
        if (newMeetings.isNotEmpty()) {
            val totalCount = meetingsRepository.countByUserId(userId) + newMeetings.size
            checkSize(totalCount, MAX_MEETINGS, ErrorCode.MANY_MEETINGS)

            val todayCount = meetingsRepository.countByUserIdSince(userId, startOfToday())
            val dailyTotal = todayCount + newMeetings.size
            checkSize(dailyTotal, MAX_DAILY_MEETINGS, ErrorCode.DAILY_MEETINGS_LIMIT)
        }

        if (meetingList.isNotEmpty()) {
            try {
                val specs = meetingList.map { meeting ->
                    val sanitized = meeting.copy(
                        description = profanityFilterService.sanitize(meeting.description),
                    )
                    Meeting.of(userId, sanitized)
                }
                specs.forEach { spec ->
                    val recipientId = spec.otherUserId
                        ?: throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("userId" to "userId"))
                    ensureNotBlockedByRecipient(recipientId, userId)
                    validateScheduledAt(spec.scheduledAt)
                    databaseClient.sql(
                        """
                        INSERT INTO meetings(
                            user_id, other_user_id, other_user_lat, other_user_lon,
                            distance, timestamp, status, description, scheduled_at
                        )
                        VALUES (
                            :userId, :otherUserId, :otherUserLat, :otherUserLon,
                            :distance, :timestamp, 'PENDING', :description, :scheduledAt
                        )
                        ON CONFLICT (user_id, other_user_id) DO UPDATE
                        SET other_user_lat = excluded.other_user_lat,
                            other_user_lon = excluded.other_user_lon,
                            distance = excluded.distance,
                            timestamp = excluded.timestamp,
                            status = 'PENDING',
                            description = excluded.description,
                            scheduled_at = excluded.scheduled_at
                        """
                    )
                        .bind("userId", spec.userId!!)
                        .bind("otherUserId", spec.otherUserId!!)
                        .bind("otherUserLat", spec.otherUserLat!!)
                        .bind("otherUserLon", spec.otherUserLon!!)
                        .bind("distance", spec.distance!!)
                        .bind("timestamp", spec.timestamp!!)
                        .bind("description", spec.description.orEmpty())
                        .bind("scheduledAt", spec.scheduledAt!!)
                        .fetch()
                        .rowsUpdated()
                        .awaitFirstOrNull()
                }

                if (specs.isNotEmpty()) {
                    val sender = userService.findUserById(userId)
                    val senderName = sender?.name?.takeIf { it.isNotBlank() } ?: "Пользователь"
                    specs.forEach { spec ->
                        spec.otherUserId?.let { otherId ->
                            pushNotificationService.notifyNewMeeting(otherId, userId, senderName)
                        }
                    }
                }
            } catch (ex: DataAccessException) {
                log.error("Failed save meetings for userId [{}]: {}", userId, ex.message, ex)
                throw ex
            }
        }
        return findAllMeetingsByUserId(userId, defaultPageable)
    }

    @Transactional
    suspend fun deleteMetingWithUserId(currentUserId: UUID, otherUserId: UUID): List<Meeting> {
        val meeting = meetingsRepository.findBySenderAndRecipient(currentUserId, otherUserId)
        if (meeting == null) {
            val incomingMeeting = meetingsRepository.findBySenderAndRecipient(otherUserId, currentUserId)
            if (incomingMeeting != null) {
                throw ApiException(ErrorCode.ACCESS_DENIED)
            }
            return findAllMeetingsByUserId(currentUserId, defaultPageable)
        }
        if (meeting.userId != currentUserId) {
            throw ApiException(ErrorCode.ACCESS_DENIED)
        }
        try {
            val recipientId = meeting.otherUserId
            val status = meeting.status?.takeIf { it.isNotBlank() } ?: "PENDING"
            meetingsRepository.deleteByUserIdAndOtherUserId(currentUserId, otherUserId)
            if (recipientId != null && (status == "PENDING" || status == "ACCEPTED")) {
                notifyMeetingRevoked(currentUserId, recipientId, status == "ACCEPTED")
            }
        } catch (ex: DataAccessException) {
            log.error("Failed delete meetings for userId [{}]: {}", otherUserId, ex.message, ex)
            throw ex
        }
        return findAllMeetingsByUserId(currentUserId, defaultPageable)
    }

    @Transactional
    suspend fun declineMeeting(currentUserId: UUID, senderUserId: UUID): Meeting? {
        log.info("declineMeeting: currentUserId={}, senderUserId={}", currentUserId, senderUserId)
        val meeting = meetingsRepository.findBySenderAndRecipient(senderUserId, currentUserId)
        log.info("declineMeeting: found meeting={}", meeting)
        if (meeting == null) {
            log.warn("declineMeeting: no meeting found from {} to {}", senderUserId, currentUserId)
            return null
        }

        if (meeting.status == "DECLINED") {
            return meeting
        }

        val previousStatus = meeting.status?.takeIf { it.isNotBlank() } ?: "PENDING"
        val updated = meetingStatusUpdater.updateStatusBySenderAndRecipient(senderUserId, currentUserId, "DECLINED")
        log.info("declineMeeting: updateStatus returned {}", updated)

        val initiatorId = meeting.userId
        if (initiatorId != null && initiatorId != currentUserId) {
            val declineText = if (previousStatus == "ACCEPTED") {
                MeetingSystemMailMessages.ACCEPTED_CANCELLED
            } else {
                MeetingSystemMailMessages.DECLINED
            }
            val saved = mailboxRepository.save(
                MailSystemMessage.create(currentUserId, initiatorId, declineText)
            )
            mailboxRealtimeNotifier.onMessagePersisted(saved)
        }

        val result = meetingsRepository.findBySenderAndRecipient(senderUserId, currentUserId)
        log.info("declineMeeting: result status={}", result?.status)
        return result
    }

    @Transactional
    suspend fun acceptMeeting(currentUserId: UUID, otherUserId: UUID): Meeting? {
        log.info("acceptMeeting: currentUserId={}, otherUserId={}", currentUserId, otherUserId)
        val meeting = meetingsRepository.findBySenderAndRecipient(otherUserId, currentUserId)
        log.info("acceptMeeting: found meeting={}", meeting)
        if (meeting == null) {
            log.warn("acceptMeeting: no meeting found from {} to {}", otherUserId, currentUserId)
            return null
        }

        if (meeting.status == "DECLINED") {
            log.warn("acceptMeeting: meeting was declined from {} to {}", otherUserId, currentUserId)
            return null
        }

        if (meeting.status == "ACCEPTED") {
            return meeting
        }

        val updated = meetingStatusUpdater.updateStatusBySenderAndRecipient(otherUserId, currentUserId, "ACCEPTED")
        log.info("acceptMeeting: updateStatus returned {}", updated)

        val initiatorId = meeting.userId
        if (initiatorId != null && initiatorId != currentUserId) {
            val saved = mailboxRepository.save(
                MailSystemMessage.create(
                    currentUserId,
                    initiatorId,
                    MeetingSystemMailMessages.ACCEPTED
                )
            )
            mailboxRealtimeNotifier.onMessagePersisted(saved)
        }

        val result = meetingsRepository.findBySenderAndRecipient(otherUserId, currentUserId)
        log.info("acceptMeeting: result status={}", result?.status)
        return result
    }

    @Transactional(readOnly = true)
    suspend fun hasSentMeeting(userId: UUID, otherUserId: UUID): Boolean {
        return meetingsRepository.existsByUserIdAndOtherUserId(userId, otherUserId)
    }

    @Transactional(readOnly = true)
    suspend fun countIncomingSince(userId: UUID, sinceMs: Long): Long {
        return meetingsRepository.countIncomingSince(userId, java.sql.Timestamp(sinceMs))
    }

    @Transactional(readOnly = true)
    suspend fun getMeetingLimits(userId: UUID): MeetingLimitResponse {
        return MeetingLimitResponse(
            totalCount = meetingsRepository.countByUserId(userId).toInt(),
            totalLimit = MAX_MEETINGS,
            dailyCount = meetingsRepository.countByUserIdSince(userId, startOfToday()).toInt(),
            dailyLimit = MAX_DAILY_MEETINGS,
        )
    }

    private fun startOfToday(): Timestamp {
        val start = LocalDate.now(MEETING_DAY_ZONE).atStartOfDay(MEETING_DAY_ZONE).toInstant()
        return Timestamp.from(start)
    }

    private fun validateScheduledAt(scheduledAt: Timestamp?) {
        if (scheduledAt == null || scheduledAt.time < System.currentTimeMillis() - SCHEDULED_AT_TOLERANCE_MS) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER,
                mapOf(Pair(ErrorCode.Constants.PARAMETER_NAME, "scheduledAt"))
            )
        }
    }

    private suspend fun ensureNotBlockedByRecipient(recipientId: UUID, senderId: UUID) {
        if (userService.isBlockedBy(recipientId, senderId)) {
            throw ApiException(ErrorCode.USER_IS_BLOCKED)
        }
    }

    private suspend fun notifyMeetingRevoked(senderId: UUID, recipientId: UUID, wasAccepted: Boolean) {
        val text = if (wasAccepted) {
            MeetingSystemMailMessages.REVOKED_ACCEPTED
        } else {
            MeetingSystemMailMessages.REVOKED_PENDING
        }
        val saved = mailboxRepository.save(MailSystemMessage.create(senderId, recipientId, text))
        mailboxRealtimeNotifier.onMessagePersisted(saved)
    }

    companion object {
        const val MAX_MEETINGS = 20
        const val MAX_DAILY_MEETINGS = 5
        private const val SCHEDULED_AT_TOLERANCE_MS = 60_000L
        private val MEETING_DAY_ZONE: ZoneId = ZoneId.of("Europe/Moscow")
    }
}
