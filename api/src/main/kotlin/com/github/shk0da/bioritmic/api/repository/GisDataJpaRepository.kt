package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.jpaTransactionManager
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
    @Query(
        "insert into gis_data(user_id, lat, lon, timestamp) " +
            "values (:userId, :lat, :lon, :timestamp) " +
            "on conflict (user_id) do update " +
            "set lat = excluded.lat, lon = excluded.lon, timestamp = excluded.timestamp",
        nativeQuery = true
    )
    fun insert(userId: Long?, lat: Double?, lon: Double?, timestamp: Timestamp?): Int
}
