package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.DiamondWallet
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Repository
@Transactional(transactionManager = transactionManager)
interface DiamondWalletRepository : CoroutineCrudRepository<DiamondWallet, UUID> {

    @Modifying
    @Query(
        """
        INSERT INTO diamond_wallets (user_id, balance, updated_at)
        VALUES (:userId, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING
        """
    )
    suspend fun ensureWallet(userId: UUID): Int

    @Query("SELECT balance FROM diamond_wallets WHERE user_id = :userId")
    suspend fun findBalance(userId: UUID): Long?

    @Query("SELECT user_id, balance, updated_at FROM diamond_wallets WHERE user_id IN (:userIds)")
    suspend fun findBalancesByUserIds(userIds: Collection<UUID>): List<DiamondWallet>

    @Modifying
    @Query(
        """
        UPDATE diamond_wallets
        SET balance = balance - :amount, updated_at = NOW()
        WHERE user_id = :userId AND balance >= :amount
        """
    )
    suspend fun debitIfSufficient(userId: UUID, amount: Long): Int

    @Modifying
    @Query(
        """
        UPDATE diamond_wallets
        SET balance = balance + :amount, updated_at = NOW()
        WHERE user_id = :userId
        """
    )
    suspend fun credit(userId: UUID, amount: Long): Int

    @Modifying
    @Query(
        """
        INSERT INTO diamond_wallets (user_id, balance, updated_at)
        VALUES (:userId, :balance, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET balance = :balance, updated_at = NOW()
        """
    )
    suspend fun upsertBalance(userId: UUID, balance: Long): Int
}
