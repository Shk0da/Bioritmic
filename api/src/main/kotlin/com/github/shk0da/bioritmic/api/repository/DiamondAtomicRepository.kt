package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.domain.DiamondTransactionType
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import kotlinx.coroutines.reactive.awaitSingle
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Component
import java.sql.Timestamp
import java.time.LocalDateTime
import java.util.UUID

@Component
class DiamondAtomicRepository(
    private val databaseClient: DatabaseClient,
) {
    suspend fun transfer(
        fromUserId: UUID,
        toUserId: UUID,
        amount: Long,
        type: String = DiamondTransactionType.TRANSFER,
        requirePurchase: Boolean = true,
    ): DiamondTransferAtomicResult = runCatching {
        databaseClient.sql(
            """
            SELECT new_from_balance, transaction_id
            FROM transfer_diamonds_atomic(:fromUserId, :toUserId, :amount, :type, :requirePurchase)
            """.trimIndent(),
        )
            .bind("fromUserId", fromUserId)
            .bind("toUserId", toUserId)
            .bind("amount", amount)
            .bind("type", type)
            .bind("requirePurchase", requirePurchase)
            .map { row, _ ->
                DiamondTransferAtomicResult(
                    newFromBalance = row.get("new_from_balance", Long::class.javaObjectType)!!,
                    transactionId = row.get("transaction_id", Long::class.javaObjectType)!!,
                )
            }
            .one()
            .awaitSingle()
    }.getOrElse { throw mapDiamondDbException(it) }

    suspend fun purchaseBoost(
        userId: UUID,
        cost: Long,
        hours: Int,
    ): BoostPurchaseAtomicResult = runCatching {
        databaseClient.sql(
            """
            SELECT new_balance, transaction_id, boost_id, boost_expires_at
            FROM purchase_boost_atomic(:userId, :cost, :hours)
            """.trimIndent(),
        )
            .bind("userId", userId)
            .bind("cost", cost)
            .bind("hours", hours)
            .map { row, _ ->
                BoostPurchaseAtomicResult(
                    newBalance = row.get("new_balance", Long::class.javaObjectType)!!,
                    transactionId = row.get("transaction_id", Long::class.javaObjectType)!!,
                    boostId = row.get("boost_id", Long::class.javaObjectType)!!,
                    expiresAt = Timestamp.valueOf(row.get("boost_expires_at", LocalDateTime::class.java)!!),
                )
            }
            .one()
            .awaitSingle()
    }.getOrElse { throw mapDiamondDbException(it) }

    suspend fun grantRegistrationBonus(userId: UUID): RegistrationBonusAtomicResult = runCatching {
        databaseClient.sql(
            """
            SELECT new_balance, transaction_id, granted
            FROM grant_registration_bonus_atomic(:userId)
            """.trimIndent(),
        )
            .bind("userId", userId)
            .map { row, _ ->
                RegistrationBonusAtomicResult(
                    newBalance = row.get("new_balance", Long::class.javaObjectType)!!,
                    transactionId = row.get("transaction_id", Long::class.javaObjectType),
                    granted = row.get("granted", Boolean::class.javaObjectType)!!,
                )
            }
            .one()
            .awaitSingle()
    }.getOrElse { throw mapDiamondDbException(it) }

    suspend fun setBalanceByAdmin(
        adminUserId: UUID,
        userId: UUID,
        balance: Long,
    ): AdminBalanceAtomicResult = runCatching {
        databaseClient.sql(
            """
            SELECT new_balance, transaction_id
            FROM set_diamond_balance_atomic(:adminUserId, :userId, :balance)
            """.trimIndent(),
        )
            .bind("adminUserId", adminUserId)
            .bind("userId", userId)
            .bind("balance", balance)
            .map { row, _ ->
                AdminBalanceAtomicResult(
                    newBalance = row.get("new_balance", Long::class.javaObjectType)!!,
                    transactionId = row.get("transaction_id", Long::class.javaObjectType),
                )
            }
            .one()
            .awaitSingle()
    }.getOrElse { throw mapDiamondDbException(it) }

    suspend fun recordPurchase(userId: UUID, amount: Long): PurchaseAtomicResult = runCatching {
        databaseClient.sql(
            """
            SELECT new_balance, transaction_id
            FROM record_purchase_atomic(:userId, :amount)
            """.trimIndent(),
        )
            .bind("userId", userId)
            .bind("amount", amount)
            .map { row, _ ->
                PurchaseAtomicResult(
                    newBalance = row.get("new_balance", Long::class.javaObjectType)!!,
                    transactionId = row.get("transaction_id", Long::class.javaObjectType)!!,
                )
            }
            .one()
            .awaitSingle()
    }.getOrElse { throw mapDiamondDbException(it) }

    private fun mapDiamondDbException(error: Throwable): Throwable {
        var current: Throwable? = error
        while (current != null) {
            when {
                current.message?.contains(INSUFFICIENT_BALANCE) == true ->
                    return ApiException(ErrorCode.DIAMOND_INSUFFICIENT_BALANCE)
                current.message?.contains(SAME_USER_TRANSFER) == true ->
                    return ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot transfer to yourself"))
                current.message?.contains(INVALID_AMOUNT) == true ->
                    return ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Amount must be positive"))
                current.message?.contains(PURCHASE_REQUIRED) == true ->
                    return ApiException(ErrorCode.DIAMOND_PURCHASE_REQUIRED)
                current.message?.contains(INVALID_BALANCE) == true ->
                    return ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Balance cannot be negative"))
            }
            current = current.cause
        }
        return error
    }

    companion object {
        private const val INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE"
        private const val SAME_USER_TRANSFER = "SAME_USER_TRANSFER"
        private const val INVALID_AMOUNT = "INVALID_AMOUNT"
        private const val INVALID_BALANCE = "INVALID_BALANCE"
        private const val PURCHASE_REQUIRED = "PURCHASE_REQUIRED"
    }
}

data class RegistrationBonusAtomicResult(
    val newBalance: Long,
    val transactionId: Long?,
    val granted: Boolean,
)

data class AdminBalanceAtomicResult(
    val newBalance: Long,
    val transactionId: Long?,
)

data class PurchaseAtomicResult(
    val newBalance: Long,
    val transactionId: Long,
)

data class DiamondTransferAtomicResult(
    val newFromBalance: Long,
    val transactionId: Long,
)

data class BoostPurchaseAtomicResult(
    val newBalance: Long,
    val transactionId: Long,
    val boostId: Long,
    val expiresAt: Timestamp,
)
