package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Meeting
import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.MeetingStatusUpdater
import com.github.shk0da.bioritmic.api.repository.MeetingsRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import kotlinx.coroutines.reactive.awaitFirstOrNull
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.data.domain.Sort
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Service
class MeetingsService(
    val meetingsRepository: MeetingsRepository,
    val meetingStatusUpdater: MeetingStatusUpdater,
    val mailboxRepository: MailboxRepository,
    val databaseClient: DatabaseClient,
    private val userService: UserService,
    private val pushNotificationService: PushNotificationService
) {

    private val log = LoggerFactory.getLogger(MeetingsService::class.java)

    private val maximumUserMeetingsSize = 100
    private val defaultPageable = PageableRequest(1, maximumUserMeetingsSize, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun findAllMeetingsByUserId(userId: UUID, pageable: PageableRequest): List<Meeting> {
        val incoming = meetingsRepository.findIncomingByUserId(userId, pageable.pageSize, pageable.offset)
        val acceptedOutgoing = meetingsRepository.findSentAcceptedByUserId(userId, pageable.pageSize, pageable.offset)
        val seen = mutableSetOf<Pair<UUID?, UUID?>>()
        return (incoming + acceptedOutgoing)
            .filter { meeting ->
                val key = meeting.userId to meeting.otherUserId
                seen.add(key)
            }
            .sortedByDescending { it.timestamp?.time ?: 0L }
    }

    @Transactional
    suspend fun createMeetings(userId: UUID, meetings: List<UserMeeting>): List<Meeting> {
        val meetingList = meetings.filter { it.isFilledInput() && it.userId != userId }
        val currentElementsCount = meetingsRepository.countByUserId(userId)
        val totalCount = (currentElementsCount + meetingList.count()).toInt()
        if (checkSize(totalCount, maximumUserMeetingsSize, ErrorCode.MANY_MEETINGS)) {
            try {
                val specs = meetingList.map { Meeting.of(userId, it) }
                specs.forEach { spec ->
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
                            pushNotificationService.notifyNewMeeting(otherId, senderName)
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
    suspend fun deleteMetingWithUserId(currentUserId: UUID, userId: UUID): List<Meeting> {
        try {
            meetingsRepository.deleteByUserIdAndOtherUserId(currentUserId, userId)
        } catch (ex: DataAccessException) {
            log.error("Failed delete meetings for userId [{}]: {}", userId, ex.message, ex)
            throw ex
        }
        return findAllMeetingsByUserId(currentUserId, defaultPageable)
    }

    @Transactional
    suspend fun declineMeeting(currentUserId: UUID, senderUserId: UUID): Meeting? {
        log.info("declineMeeting: currentUserId={}, senderUserId={}", currentUserId, senderUserId)
        val meeting = meetingsRepository.findByUserPair(senderUserId, currentUserId)
        log.info("declineMeeting: found meeting={}", meeting)
        if (meeting == null) {
            log.warn("declineMeeting: no meeting found between {} and {}", senderUserId, currentUserId)
            return null
        }

        if (meeting.status == "DECLINED") {
            return meeting
        }

        val updated = meetingStatusUpdater.updateStatus(senderUserId, currentUserId, "DECLINED")
        log.info("declineMeeting: updateStatus returned {}", updated)

        val initiatorId = if (meeting.userId == currentUserId) meeting.otherUserId else meeting.userId
        if (initiatorId != null && initiatorId != currentUserId) {
            val declineMessage = UserMail()
            declineMessage.fromUserId = currentUserId
            declineMessage.toUserId = initiatorId
            declineMessage.message = "К сожалению, ваше предложение встречи отклонено."
            declineMessage.timestamp = Timestamp(System.currentTimeMillis())
            mailboxRepository.save(declineMessage)
        }

        val result = meetingsRepository.findByUserPair(senderUserId, currentUserId)
        log.info("declineMeeting: result status={}", result?.status)
        return result
    }

    @Transactional
    suspend fun acceptMeeting(currentUserId: UUID, otherUserId: UUID): Meeting? {
        log.info("acceptMeeting: currentUserId={}, otherUserId={}", currentUserId, otherUserId)
        val meeting = meetingsRepository.findByUserPair(otherUserId, currentUserId)
        log.info("acceptMeeting: found meeting={}", meeting)
        if (meeting == null) {
            log.warn("acceptMeeting: no meeting found between {} and {}", otherUserId, currentUserId)
            return null
        }

        if (meeting.status == "DECLINED") {
            log.warn("acceptMeeting: meeting was declined between {} and {}", otherUserId, currentUserId)
            return null
        }

        if (meeting.status == "ACCEPTED") {
            return meeting
        }

        val updated = meetingStatusUpdater.updateStatus(otherUserId, currentUserId, "ACCEPTED")
        log.info("acceptMeeting: updateStatus returned {}", updated)

        val initiatorId = if (meeting.userId == currentUserId) meeting.otherUserId else meeting.userId
        if (initiatorId != null && initiatorId != currentUserId) {
            val acceptMessage = UserMail()
            acceptMessage.fromUserId = currentUserId
            acceptMessage.toUserId = initiatorId
            acceptMessage.message = "Ваше предложение встречи принято!"
            acceptMessage.timestamp = Timestamp(System.currentTimeMillis())
            mailboxRepository.save(acceptMessage)
        }

        val result = meetingsRepository.findByUserPair(otherUserId, currentUserId)
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

    private fun validateScheduledAt(scheduledAt: Timestamp?) {
        if (scheduledAt == null || scheduledAt.time < System.currentTimeMillis() - SCHEDULED_AT_TOLERANCE_MS) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER,
                mapOf(Pair(ErrorCode.Constants.PARAMETER_NAME, "scheduledAt"))
            )
        }
    }

    companion object {
        private const val SCHEDULED_AT_TOLERANCE_MS = 60_000L
    }
}
