package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Ban
import com.github.shk0da.bioritmic.api.domain.Report
import com.github.shk0da.bioritmic.api.repository.BanRepository
import com.github.shk0da.bioritmic.api.repository.ReportRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID
import java.util.concurrent.TimeUnit

@Service
class ReportService(
    private val reportRepository: ReportRepository,
    private val banRepository: BanRepository
) {

    companion object {
        private const val BAN_DURATION_DAYS = 7L
    }

    private val log = LoggerFactory.getLogger(ReportService::class.java)

    @Value("\${report.auto-ban-threshold:5}")
    private var autoBanThreshold: Int = 5

    @Transactional
    suspend fun createReport(reporterId: UUID, reportedId: UUID, reason: String, description: String?): Report {
        val report = Report()
        report.reporterId = reporterId
        report.reportedId = reportedId
        report.reason = reason
        report.description = description
        report.status = "PENDING"
        report.createdAt = Timestamp(System.currentTimeMillis())

        val saved = reportRepository.save(report)
        log.info("Report created: {} -> {} reason: {}", reporterId, reportedId, reason)

        checkAndBanIfNeeded(reportedId)
        return saved
    }

    private suspend fun checkAndBanIfNeeded(userId: UUID) {
        val pendingCount = reportRepository.countPendingByReportedId(userId)
        if (pendingCount >= autoBanThreshold) {
            banUser(userId, "Автоматический бан: $pendingCount жалоб")
        }
    }

    @Transactional
    suspend fun banUser(userId: UUID, reason: String) {
        val ban = Ban()
        ban.userId = userId
        ban.reason = reason
        ban.permanent = false
        ban.bannedUntil = Timestamp(System.currentTimeMillis() + TimeUnit.DAYS.toMillis(BAN_DURATION_DAYS))
        ban.createdAt = Timestamp(System.currentTimeMillis())

        banRepository.save(ban)
        log.warn("User {} banned: {}", userId, reason)
    }

    suspend fun isUserBanned(userId: UUID): Boolean {
        return banRepository.findActiveByUserId(userId) != null
    }

    suspend fun getBan(userId: UUID): Ban? {
        return banRepository.findActiveByUserId(userId)
    }
}
