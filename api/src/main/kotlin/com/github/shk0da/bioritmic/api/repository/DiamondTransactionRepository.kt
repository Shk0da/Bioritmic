package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.DiamondTransaction
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface DiamondTransactionRepository : CoroutineCrudRepository<DiamondTransaction, Long> {

    @Query(
        """
        SELECT COUNT(*) FROM diamond_transactions
        WHERE from_user_id = :userId OR to_user_id = :userId
        """
    )
    suspend fun countByParticipant(userId: UUID): Long

    @Query(
        """
        SELECT * FROM diamond_transactions
        WHERE from_user_id = :userId OR to_user_id = :userId
        ORDER BY created_at DESC, id DESC
        LIMIT :limit OFFSET :offset
        """
    )
    suspend fun findByParticipant(userId: UUID, limit: Int, offset: Long): List<DiamondTransaction>
}
