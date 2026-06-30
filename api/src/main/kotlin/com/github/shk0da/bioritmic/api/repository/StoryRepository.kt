package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Story
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface StoryRepository : CoroutineCrudRepository<Story, Long> {

    @Transactional(readOnly = true)
    @Query("SELECT * FROM stories WHERE user_id = :userId AND (expires_at > NOW() OR locked = TRUE) ORDER BY created_at DESC")
    suspend fun findActiveByUserId(userId: UUID): List<Story>

    @Transactional(readOnly = true)
    @Query("SELECT * FROM stories WHERE (expires_at > NOW() OR locked = TRUE) ORDER BY created_at DESC LIMIT :limit")
    suspend fun findAllActive(limit: Int = 200): List<Story>

    @Transactional(readOnly = true)
    @Query(
        """
        SELECT s.* FROM stories s
        WHERE (s.expires_at > NOW() OR s.locked = TRUE)
          AND (
            s.user_id = :viewerId
            OR EXISTS (
              SELECT 1 FROM bookmarks b
              WHERE b.user_id = :viewerId AND b.other_user_id = s.user_id
            )
          )
        ORDER BY s.created_at DESC
        LIMIT :limit
        """
    )
    suspend fun findActiveBookmarkedByViewer(viewerId: UUID, limit: Int = 200): List<Story>

    @Modifying
    @Query("DELETE FROM stories WHERE expires_at < :now AND locked = FALSE")
    suspend fun deleteExpired(now: Timestamp)

    @Query("SELECT * FROM stories WHERE expires_at < :now AND locked = FALSE")
    suspend fun findExpiredBefore(now: Timestamp): List<Story>

    @Query(
        """
        SELECT DISTINCT trim(leading '/api/v1/photos/s3/' from media_url)
        FROM stories
        WHERE media_url IS NOT NULL AND media_url LIKE '/api/v1/photos/s3/%'
        """
    )
    suspend fun findAllMediaS3Keys(): List<String>

    @Transactional(readOnly = true)
    @Query(
        """
        SELECT COUNT(*) FROM stories s
        WHERE (s.expires_at > NOW() OR s.locked = TRUE)
          AND s.media_url LIKE CONCAT('%', :s3Key)
          AND (
            s.user_id = :viewerId
            OR EXISTS (
              SELECT 1 FROM bookmarks b
              WHERE b.user_id = :viewerId AND b.other_user_id = s.user_id
            )
          )
        """
    )
    suspend fun canViewerAccessStoryMedia(viewerId: UUID, s3Key: String): Long
}
