package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.Interest
import com.github.shk0da.bioritmic.api.domain.UserInterest
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface InterestRepository : CoroutineCrudRepository<Interest, Long> {

    @Query("select * from interests where active = true order by category, name")
    suspend fun findAllActive(): List<Interest>

    @Query("select * from interests where category = :category and active = true order by name")
    suspend fun findAllByCategory(category: String): List<Interest>

    @Query("select * from interests where id in (:ids) and active = true")
    suspend fun findAllByIds(ids: List<Long>): List<Interest>
}

@Repository
@Transactional(transactionManager = transactionManager)
interface UserInterestRepository : CoroutineCrudRepository<UserInterest, Long> {

    @Query(
        "select ui.*, i.name, i.category, i.icon from user_interests ui " +
            "join interests i on ui.interest_id = i.id where ui.user_id = :userId"
    )
    suspend fun findInterestsByUserId(userId: Long): List<Interest>

    @Query("select * from user_interests where user_id = :userId")
    suspend fun findAllByUserId(userId: Long): List<UserInterest>

    @Query("select * from user_interests where user_id = :userId and interest_id = :interestId")
    suspend fun findByUserIdAndInterestId(userId: Long, interestId: Long): UserInterest?

    @Modifying
    @Query("delete from user_interests where user_id = :userId")
    suspend fun deleteAllByUserId(userId: Long)

    @Modifying
    @Query("delete from user_interests where user_id = :userId and interest_id = :interestId")
    suspend fun deleteByUserIdAndInterestId(userId: Long, interestId: Long)
}
