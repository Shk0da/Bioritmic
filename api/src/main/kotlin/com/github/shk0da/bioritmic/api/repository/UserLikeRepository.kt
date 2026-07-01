package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserLike
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface UserLikeRepository : CoroutineCrudRepository<UserLike, UserLike.PrimaryKey> {

    @Modifying
    @Query(
        """
        INSERT INTO user_likes (user_id, other_user_id, timestamp)
        VALUES (:userId, :otherUserId, NOW())
        ON CONFLICT (user_id, other_user_id)
        DO UPDATE SET timestamp = NOW()
        """
    )
    suspend fun upsert(userId: UUID, otherUserId: UUID)

    @Query(
        "SELECT l1.other_user_id FROM user_likes l1 " +
            "JOIN user_likes l2 ON l1.other_user_id = l2.user_id AND l2.other_user_id = l1.user_id " +
            "WHERE l1.user_id = :userId"
    )
    suspend fun findMutualLikeUserIds(userId: UUID): List<UUID>

    @Query(
        "SELECT COUNT(*) FROM user_likes l1 " +
            "JOIN user_likes l2 ON l1.other_user_id = l2.user_id AND l2.other_user_id = l1.user_id " +
            "WHERE l1.user_id = :userId"
    )
    suspend fun countMutualLikes(userId: UUID): Long

    @Query("SELECT EXISTS(SELECT 1 FROM user_likes WHERE user_id = :userId AND other_user_id = :otherUserId)")
    suspend fun existsByUserIdAndOtherUserId(userId: UUID, otherUserId: UUID): Boolean
}
