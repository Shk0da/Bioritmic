package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.UserMail
import kotlinx.coroutines.flow.Flow
import org.springframework.data.domain.Pageable
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface MailboxRepository : CoroutineCrudRepository<UserMail, Long> {

    @Query(
        "select * from (" +
            "select row_number() over(partition by (case when from_user_id = :userId then to_user_id when to_user_id = :userId then from_user_id end) order by timestamp desc) as rn, " +
            "id, from_user_id, to_user_id, message, timestamp " +
            "from mailbox " +
            "where from_user_id = :userId or to_user_id = :userId" +
            ") t where rn = 1 order by timestamp desc limit :limit offset :offset"
    )
    suspend fun findLatestMailsByUserId(userId: Long, limit: Int, offset: Long): List<UserMail>

    fun findAllByFromUserIdAndToUserId(from: Long, to: Long, pageable: Pageable?): Flow<UserMail>

    @Query("delete from mailbox m where (m.from_user_id = :userId and m.to_user_id = :currentUserId) or (m.to_user_id = :userId and m.from_user_id = :currentUserId)")
    suspend fun deleteAllMailByBetweenTwoUserId(currentUserId: Long, userId: Long)
}
