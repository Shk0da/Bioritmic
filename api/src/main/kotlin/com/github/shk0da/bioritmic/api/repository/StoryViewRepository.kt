package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.StoryView
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface StoryViewRepository : CoroutineCrudRepository<StoryView, Long> {

    @Transactional(readOnly = true)
    @Query("SELECT EXISTS(SELECT 1 FROM story_views WHERE story_id = :storyId AND viewer_id = :viewerId)")
    suspend fun existsByStoryIdAndViewerId(storyId: Long, viewerId: Long): Boolean

    @Transactional(readOnly = true)
    @Query("SELECT COUNT(*) FROM story_views WHERE story_id = :storyId")
    suspend fun countViewersByStoryId(storyId: Long): Int
}
