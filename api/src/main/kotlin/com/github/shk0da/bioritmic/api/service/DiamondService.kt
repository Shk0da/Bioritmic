package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.constants.UserRoleConstants.Companion.ROLE_ADMIN
import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.DiamondTransaction
import com.github.shk0da.bioritmic.api.domain.DiamondTransactionType
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.mailbox.DiamondMailMessage
import com.github.shk0da.bioritmic.api.repository.BookmarkRepository
import com.github.shk0da.bioritmic.api.repository.DiamondAtomicRepository
import com.github.shk0da.bioritmic.api.repository.DiamondTransactionRepository
import com.github.shk0da.bioritmic.api.repository.DiamondWalletRepository
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.UserRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import com.github.shk0da.bioritmic.api.service.mailbox.MailboxRealtimeNotifier
import kotlinx.coroutines.flow.toList
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.util.UUID

@Service
class DiamondService(
    private val diamondWalletRepository: DiamondWalletRepository,
    private val diamondAtomicRepository: DiamondAtomicRepository,
    private val diamondTransactionRepository: DiamondTransactionRepository,
    private val userRepository: UserRepository,
    private val userRoleRepository: UserRoleRepository,
    private val bookmarkRepository: BookmarkRepository,
    private val mailboxRepository: MailboxRepository,
    private val mailboxRealtimeNotifier: MailboxRealtimeNotifier,
    private val diamondBalanceNotifier: DiamondBalanceNotifier,
    private val pushNotificationService: PushNotificationService,
    private val userVerificationService: UserVerificationService,
) {
    private val log = LoggerFactory.getLogger(DiamondService::class.java)

    suspend fun getBalance(userId: UUID): Long {
        diamondWalletRepository.ensureWallet(userId)
        return diamondWalletRepository.findBalance(userId) ?: 0L
    }

    suspend fun getBalancesByUserIds(userIds: Collection<UUID>): Map<UUID, Long> {
        if (userIds.isEmpty()) {
            return emptyMap()
        }
        return diamondWalletRepository.findBalancesByUserIds(userIds)
            .associate { it.userId!! to it.balance }
    }

    suspend fun listTransactions(userId: UUID, page: Int, size: Int): PaginatedDiamondTransactions {
        val pageSize = size.coerceIn(1, MAX_PAGE_SIZE)
        val safePage = page.coerceAtLeast(0)
        val total = diamondTransactionRepository.countByParticipant(userId)
        val items = diamondTransactionRepository.findByParticipant(
            userId,
            pageSize,
            safePage.toLong() * pageSize,
        )
        val counterpartyIds = items.mapNotNull { tx ->
            when {
                tx.fromUserId == userId -> tx.toUserId
                tx.toUserId == userId -> tx.fromUserId
                else -> null
            }
        }.toSet()
        val namesById = if (counterpartyIds.isEmpty()) {
            emptyMap()
        } else {
            userRepository.findAllById(counterpartyIds).toList().associate { it.id!! to it.name }
        }
        val views = items.map { tx -> toView(tx, userId, namesById) }
        return PaginatedDiamondTransactions(items = views, total = total, page = safePage, size = pageSize)
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun transfer(
        fromUserId: UUID,
        toUserId: UUID,
        amount: Long,
        requireBookmark: Boolean,
    ): DiamondTransferResult {
        userVerificationService.requireVerified(fromUserId)
        validateAmount(amount)
        if (fromUserId == toUserId) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Cannot transfer to yourself"))
        }
        userRepository.findById(toUserId)
            ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        if (requireBookmark && !bookmarkRepository.existsByUserIdAndOtherUserId(fromUserId, toUserId)) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Recipient must be in bookmarks"))
        }

        val transferResult = diamondAtomicRepository.transfer(
            fromUserId = fromUserId,
            toUserId = toUserId,
            amount = amount,
            requirePurchase = !isAdmin(fromUserId),
        )

        val senderName = userRepository.findById(fromUserId)?.name?.takeIf { it.isNotBlank() } ?: "Пользователь"
        val mail = DiamondMailMessage.create(
            fromUserId,
            toUserId,
            DiamondMailMessage.formatTransferMessage(senderName, amount),
        )
        val savedMail = mailboxRepository.save(mail)
        mailboxRealtimeNotifier.onMessagePersisted(savedMail)
        pushNotificationService.notifyDiamondTransfer(toUserId, fromUserId, senderName, amount)

        log.info(
            "Diamond transfer: from={}, to={}, amount={}, txId={}",
            fromUserId,
            toUserId,
            amount,
            transferResult.transactionId,
        )
        diamondBalanceNotifier.notify(fromUserId, transferResult.newFromBalance)
        diamondBalanceNotifier.notify(toUserId, getBalance(toUserId))
        return DiamondTransferResult(
            balance = transferResult.newFromBalance,
            transactionId = transferResult.transactionId,
            messageId = savedMail.id,
        )
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun setBalanceByAdmin(userId: UUID, balance: Long, adminUserId: UUID): Long {
        if (balance < 0) {
            throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf("error" to "Balance cannot be negative"))
        }
        userRepository.findById(userId) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val result = diamondAtomicRepository.setBalanceByAdmin(adminUserId, userId, balance)
        log.info("Admin {} set diamond balance for {}: balance={}", adminUserId, userId, result.newBalance)
        diamondBalanceNotifier.notify(userId, result.newBalance)
        return result.newBalance
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun grantRegistrationBonus(userId: UUID): Long {
        val result = diamondAtomicRepository.grantRegistrationBonus(userId)
        if (result.granted) {
            log.info("Granted registration diamond bonus to userId={}, balance={}", userId, result.newBalance)
        }
        diamondBalanceNotifier.notify(userId, result.newBalance)
        return result.newBalance
    }

    @Transactional(transactionManager = transactionManager)
    suspend fun recordPurchase(userId: UUID, amount: Long): Long {
        validateAmount(amount)
        val result = diamondAtomicRepository.recordPurchase(userId, amount)
        log.info("Recorded diamond purchase for userId={}, amount={}, balance={}", userId, amount, result.newBalance)
        diamondBalanceNotifier.notify(userId, result.newBalance)
        return result.newBalance
    }

    private suspend fun isAdmin(userId: UUID): Boolean {
        return userRoleRepository.findByUserIdAndRole(userId, ROLE_ADMIN) != null
    }

    private fun validateAmount(amount: Long) {
        if (amount <= 0 || amount > MAX_TRANSFER_AMOUNT) {
            throw ApiException(
                ErrorCode.INVALID_PARAMETER,
                mapOf("error" to "Сумма должна быть от 1 до 1 000 000"),
            )
        }
    }

    private fun toView(
        tx: DiamondTransaction,
        viewerId: UUID,
        namesById: Map<UUID, String?>,
    ): DiamondTransactionView {
        val incoming = tx.toUserId == viewerId
        val counterpartyId = if (incoming) tx.fromUserId else tx.toUserId
        return DiamondTransactionView(
            id = tx.id,
            amount = if (incoming) tx.amount else -tx.amount,
            counterpartyId = counterpartyId,
            counterpartyName = counterpartyId?.let { namesById[it] },
            type = tx.type,
            description = tx.description,
            createdAt = tx.createdAt?.toInstant()?.toString(),
        )
    }

    companion object {
        const val REGISTRATION_BONUS_AMOUNT = 100L
        const val BOOST_COST = 50L
        private const val MAX_PAGE_SIZE = 50
        private const val MAX_TRANSFER_AMOUNT = 1_000_000L
    }
}

data class DiamondTransferResult(
    val balance: Long,
    val transactionId: Long?,
    val messageId: Long?,
)

data class DiamondTransactionView(
    val id: Long?,
    val amount: Long,
    val counterpartyId: UUID?,
    val counterpartyName: String?,
    val type: String,
    val description: String?,
    val createdAt: String?,
)

data class PaginatedDiamondTransactions(
    val items: List<DiamondTransactionView>,
    val total: Long,
    val page: Int,
    val size: Int,
)
