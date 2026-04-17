package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Meeting
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.repository.MeetingsJpaRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class MeetingsService(val meetingsJpaRepository: MeetingsJpaRepository) {

    private val log = LoggerFactory.getLogger(MeetingsService::class.java)

    private val maximumUserMeetingsSize = 100
    private val defaultPageable = PageableRequest(1, maximumUserMeetingsSize, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    fun findAllMeetingsByUserId(userId: Long, pageable: PageableRequest): List<Meeting> {
        return meetingsJpaRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
    }

    @Transactional
    fun createMeetings(userId: Long, meetings: List<UserMeeting>): List<Meeting> {
        val meetingList = meetings.filter { it.isFilledInput() }
        val currentElementsCount = meetingsJpaRepository.countByUserId(userId)
        val totalCount = (currentElementsCount + meetingList.count()).toInt()
        if (checkSize(totalCount, maximumUserMeetingsSize, ErrorCode.MANY_MEETINGS)) {
            try {
                val meetings = meetingList.map { Meeting.of(userId, it) }
                meetings.forEach { meeting ->
                    meetingsJpaRepository.insert(
                        meeting.userId!!, meeting.otherUserId!!,
                        meeting.otherUserLat, meeting.otherUserLon,
                        meeting.distance, meeting.timestamp
                    )
                }
            } catch (ex: Exception) {
                log.error("Failed save meetings for userId [{}]: {}", userId, ex.message)
            }
        }
        return meetingsJpaRepository.findAllByUserId(userId, defaultPageable.pageSize, defaultPageable.offset)
    }

    @Transactional
    fun deleteMetingWithUserId(currentUserId: Long, userId: Long): List<Meeting> {
        try {
            meetingsJpaRepository.deleteByUserIdAndOtherUserId(currentUserId, userId)
        } catch (ex: Exception) {
            log.error("Failed delete meetings for userId [{}]: {}", userId, ex.message)
        }
        return meetingsJpaRepository.findAllByUserId(currentUserId, defaultPageable.pageSize, defaultPageable.offset)
    }
}
