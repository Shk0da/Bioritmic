package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.SwipeSkip
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface SwipeSkipRepository : CoroutineCrudRepository<SwipeSkip, SwipeSkip.PrimaryKey> {

    @Modifying
    @Query(
        """
        INSERT INTO swipe_skips (user_id, other_user_id, timestamp)
        VALUES (:userId, :otherUserId, NOW())
        ON CONFLICT (user_id, other_user_id)
        DO UPDATE SET timestamp = NOW()
        """
    )
    suspend fun upsert(userId: UUID, otherUserId: UUID)

    @Modifying
    @Query("DELETE FROM swipe_skips WHERE user_id = :userId AND other_user_id = :otherUserId")
    suspend fun deleteByUserIdAndOtherUserId(userId: UUID, otherUserId: UUID)
}
