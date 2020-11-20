package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Meeting
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.repository.r2dbc.MeetingsR2dbcRepository
import com.github.shk0da.bioritmic.api.utils.ValidateUtils.checkSize
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono

@Service
class MeetingsService(val meetingsR2dbcRepository: MeetingsR2dbcRepository) {

    private val log = LoggerFactory.getLogger(MeetingsService::class.java)

    private val maximumUserMeetingsSize = 100
    private val defaultPageable = PageableRequest(1, maximumUserMeetingsSize, Sort.by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    fun findAllMeetingsByUserId(userId: Long, pageable: PageableRequest): Flux<Meeting> {
        return meetingsR2dbcRepository.findAllByUserId(userId, pageable.pageSize, pageable.offset)
    }

    @Transactional
    fun createMeetings(userId: Long, meetings: Flux<UserMeeting>): Flux<Meeting> {
        val meetingList = meetings.filter { it.isFilledInput() }.cache()
        return meetingsR2dbcRepository.countByUserId(userId)
                .map { currentElementsCount ->
                    val meetingsCopy = Flux.from(meetingList)
                    meetingsCopy.count().map { newElementsCount -> (currentElementsCount + newElementsCount).toInt() }
                }
                .flatMap { it }
                .filter { totalCount -> checkSize(totalCount, maximumUserMeetingsSize, ErrorCode.MANY_MEETINGS) }
                .map {
                    meetingList
                            .map { Meeting.of(userId, it) }
                            .flatMap { meeting ->
                                meetingsR2dbcRepository.insert(
                                        meeting.userId!!, meeting.otherUserId!!,
                                        meeting.otherUserLat, meeting.otherUserLon,
                                        meeting.distance, meeting.timestamp
                                ).map { userId }
                            }
                }
                .flatMapMany { it }
                .switchIfEmpty(Mono.just(userId))
                .map { id ->
                    meetingsR2dbcRepository.findAllByUserId(id, defaultPageable.pageSize, defaultPageable.offset)
                }
                .flatMap { it }
                .doOnError {
                    log.error("Failed save meetings for userId [{}]: {}", userId, it.message)
                    Mono.error<Flux<Any>>(it)
                }
    }

    @Transactional
    fun deleteMetingWithUserId(currentUserId: Long, userId: Long): Flux<Meeting> {
        return meetingsR2dbcRepository.deleteByUserIdAndOtherUserId(currentUserId, userId)
                .map { userId }
                .switchIfEmpty(Mono.just(userId))
                .map { id ->
                    meetingsR2dbcRepository.findAllByUserId(id, defaultPageable.pageSize, defaultPageable.offset)
                }
                .flatMapMany { it }
                .doOnError {
                    log.error("Failed delete meetings for userId [{}]: {}", userId, it.message)
                    Mono.error<Flux<Any>>(it)
                }
    }
}
