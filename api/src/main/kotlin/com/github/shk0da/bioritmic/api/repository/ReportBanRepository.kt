package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Ban
import com.github.shk0da.bioritmic.api.domain.Report
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface ReportRepository : CoroutineCrudRepository<Report, Long> {

    @Query("SELECT * FROM reports WHERE reported_id = :reportedId AND status = 'PENDING'")
    suspend fun findPendingByReportedId(reportedId: UUID): List<Report>

    @Query("SELECT COUNT(*) FROM reports WHERE reported_id = :reportedId AND status = 'PENDING'")
    suspend fun countPendingByReportedId(reportedId: UUID): Long

    @Modifying
    @Query("UPDATE reports SET status = :status WHERE id = :reportId")
    suspend fun updateStatus(reportId: Long, status: String)

    @Query("SELECT * FROM reports WHERE status = 'PENDING' ORDER BY created_at DESC")
    suspend fun findAllPending(): List<Report>
}

@Repository
@Transactional(transactionManager = transactionManager)
interface BanRepository : CoroutineCrudRepository<Ban, Long> {

    @Query("SELECT * FROM bans WHERE user_id = :userId AND (permanent = true OR banned_until > NOW())")
    suspend fun findActiveByUserId(userId: UUID): Ban?

    @Modifying
    @Query("DELETE FROM bans WHERE user_id = :userId")
    suspend fun deleteAllByUserId(userId: UUID)
}
