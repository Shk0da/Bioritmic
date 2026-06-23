package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Meeting
import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.MeetingsRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import kotlinx.coroutines.flow.toList
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Service
class MeetingsService(
    val meetingsRepository: MeetingsRepository,
    val mailboxRepository: MailboxRepository
) {

    private val log = LoggerFactory.getLogger(MeetingsService::class.java)

    private val maximumUserMeetingsSize = 100
    private val defaultPageable = PageableRequest(1, maximumUserMeetingsSize, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun findAllMeetingsByUserId(userId: Long, pageable: PageableRequest): List<Meeting> {
        return meetingsRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
    }

    @Transactional
    suspend fun createMeetings(userId: Long, meetings: List<UserMeeting>): List<Meeting> {
        val meetingList = meetings.filter { it.isFilledInput() }
        val currentElementsCount = meetingsRepository.countByUserId(userId)
        val totalCount = (currentElementsCount + meetingList.count()).toInt()
        if (checkSize(totalCount, maximumUserMeetingsSize, ErrorCode.MANY_MEETINGS)) {
            try {
                val meetings = meetingList.map { Meeting.of(userId, it) }
                meetings.forEach { meeting ->
                    meetingsRepository.insert(
                        meeting.userId!!, meeting.otherUserId!!,
                        meeting.otherUserLat, meeting.otherUserLon,
                        meeting.distance, meeting.timestamp
                    )
                }
            } catch (ex: DataAccessException) {
                log.error("Failed save meetings for userId [{}]: {}", userId, ex.message)
            }
        }
        return meetingsRepository.findAllByUserId(userId, defaultPageable.pageSize, defaultPageable.offset)
    }

    @Transactional
    suspend fun deleteMetingWithUserId(currentUserId: Long, userId: Long): List<Meeting> {
        try {
            meetingsRepository.deleteByUserIdAndOtherUserId(currentUserId, userId)
        } catch (ex: DataAccessException) {
            log.error("Failed delete meetings for userId [{}]: {}", userId, ex.message)
        }
        return meetingsRepository.findAllByUserId(currentUserId, defaultPageable.pageSize, defaultPageable.offset)
    }

    @Transactional
    suspend fun declineMeeting(currentUserId: Long, senderUserId: Long): Meeting? {
        val meeting = meetingsRepository.findByUserPair(senderUserId, currentUserId)
            ?: return null

        if (meeting.status == "DECLINED") {
            return meeting
        }

        meetingsRepository.updateStatus(senderUserId, currentUserId, "DECLINED")

        val initiatorId = if (meeting.userId == currentUserId) meeting.otherUserId else meeting.userId
        if (initiatorId != null && initiatorId != currentUserId) {
            val declineMessage = UserMail()
            declineMessage.fromUserId = currentUserId
            declineMessage.toUserId = initiatorId
            declineMessage.message = "К сожалению, ваше предложение встречи отклонено."
            declineMessage.timestamp = Timestamp(System.currentTimeMillis())
            mailboxRepository.save(declineMessage)
        }

        return meetingsRepository.findByUserPair(senderUserId, currentUserId)
    }
}
