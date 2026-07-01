package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.MeetingStatusUpdater
import com.github.shk0da.bioritmic.api.repository.MeetingsRepository
import com.github.shk0da.bioritmic.api.service.mailbox.MailboxRealtimeNotifier
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.r2dbc.core.DatabaseClient
import java.sql.Timestamp
import java.util.UUID

class MeetingsServiceTest {

    private val meetingsRepository = Mockito.mock(MeetingsRepository::class.java)
    private val meetingStatusUpdater = Mockito.mock(MeetingStatusUpdater::class.java)
    private val mailboxRepository = Mockito.mock(MailboxRepository::class.java)
    private val databaseClient = Mockito.mock(DatabaseClient::class.java)
    private val userService = Mockito.mock(UserService::class.java)
    private val pushNotificationService = Mockito.mock(PushNotificationService::class.java)
    private val mailboxRealtimeNotifier = Mockito.mock(MailboxRealtimeNotifier::class.java)
    private val profanityFilterService = Mockito.mock(ProfanityFilterService::class.java)
    private val userVerificationService = Mockito.mock(UserVerificationService::class.java)

    private val service = MeetingsService(
        meetingsRepository,
        meetingStatusUpdater,
        mailboxRepository,
        databaseClient,
        userService,
        pushNotificationService,
        mailboxRealtimeNotifier,
        profanityFilterService,
        userVerificationService,
    )

    @Test
    fun `createMeetings throws when total limit exceeded`() = runBlocking {
        val userId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()

        Mockito.`when`(meetingsRepository.existsByUserIdAndOtherUserId(userId, otherUserId)).thenReturn(false)
        Mockito.`when`(meetingsRepository.countByUserId(userId)).thenReturn(MeetingsService.MAX_MEETINGS.toLong())

        val exception = assertThrows(ApiException::class.java) {
            runBlocking {
                service.createMeetings(
                    userId,
                    listOf(
                        UserMeeting(
                            userId = otherUserId,
                            lat = 55.75,
                            lon = 37.61,
                            distance = 10.0,
                            description = "Кафе",
                            scheduledAt = Timestamp(System.currentTimeMillis() + 86_400_000),
                        )
                    ),
                )
            }
        }

        assertEquals(ErrorCode.MANY_MEETINGS, exception.errorCode)
    }

    @Test
    fun `createMeetings throws when daily limit exceeded`() = runBlocking {
        val userId = UUID.randomUUID()
        val otherUserId = UUID.randomUUID()

        Mockito.`when`(meetingsRepository.existsByUserIdAndOtherUserId(userId, otherUserId)).thenReturn(false)
        Mockito.`when`(meetingsRepository.countByUserId(userId)).thenReturn(0L)
        Mockito.`when`(
            meetingsRepository.countByUserIdSince(
                anyValue(),
                anyValue(),
            )
        ).thenReturn(MeetingsService.MAX_DAILY_MEETINGS.toLong())

        val exception = assertThrows(ApiException::class.java) {
            runBlocking {
                service.createMeetings(
                    userId,
                    listOf(
                        UserMeeting(
                            userId = otherUserId,
                            lat = 55.75,
                            lon = 37.61,
                            distance = 10.0,
                            description = "Кафе",
                            scheduledAt = Timestamp(System.currentTimeMillis() + 86_400_000),
                        )
                    ),
                )
            }
        }

        assertEquals(ErrorCode.DAILY_MEETINGS_LIMIT, exception.errorCode)
    }

    @Test
    fun `getMeetingLimits returns repository counts`() = runBlocking {
        val userId = UUID.randomUUID()
        Mockito.`when`(meetingsRepository.countByUserId(userId)).thenReturn(7L)
        Mockito.`when`(
            meetingsRepository.countByUserIdSince(
                anyValue(),
                anyValue(),
            )
        ).thenReturn(2L)

        val limits = service.getMeetingLimits(userId)

        assertEquals(7, limits.totalCount)
        assertEquals(MeetingsService.MAX_MEETINGS, limits.totalLimit)
        assertEquals(2, limits.dailyCount)
        assertEquals(MeetingsService.MAX_DAILY_MEETINGS, limits.dailyLimit)
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> anyValue(): T = Mockito.any() as T
}
