package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.UserMail
import org.springframework.data.domain.Pageable
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux

@Repository
@Transactional(transactionManager = r2dbcTransactionManager)
interface MailboxR2dbcRepository : R2dbcRepository<UserMail, Long> {

    fun findByFromUserId(from: Long, pageable: Pageable): Flux<UserMail>

    fun findByToUserId(to: Long, pageable: Pageable): Flux<UserMail>

    @Query("select * from (" +
            "select row_number() over(partition by (case when from_user_id = :userId or to_user_id = :userId THEN :userId end) order by timestamp desc) as rn," +
            "id, from_user_id, to_user_id, message, timestamp " +
            "from mailbox " +
            "where from_user_id = :userId or to_user_id = :userId" +
            ") t where rn = 1")
    fun findLatestByFromUserIdOrToUserId(userId: Long, pageable: Pageable): Flux<UserMail>

    fun findAllByFromUserIdAndToUserId(from: Long, to: Long, pageable: Pageable): Flux<UserMail>
}