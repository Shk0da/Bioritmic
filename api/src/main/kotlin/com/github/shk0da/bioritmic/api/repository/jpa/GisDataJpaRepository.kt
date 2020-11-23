package com.github.shk0da.bioritmic.api.repository.jpa

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = jpaTransactionManager)
interface GisDataJpaRepository : JpaRepository<GisData, Long> {

    @Modifying
    @Query("delete from GisData where timestamp <= :timestamp")
    fun cleanOldRecords(timestamp: Timestamp): Int
}