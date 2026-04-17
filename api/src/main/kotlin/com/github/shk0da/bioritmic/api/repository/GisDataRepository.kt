package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = transactionManager)
interface GisDataRepository : CoroutineCrudRepository<GisData, Long> {

    @Modifying
    @Query(
        "insert into gis_data(user_id, lat, lon, timestamp) " +
            "values (:userId, :lat, :lon, :timestamp) " +
            "on conflict (user_id) do update " +
            "set lat = excluded.lat, lon = excluded.lon, timestamp = excluded.timestamp"
    )
    suspend fun insert(userId: Long?, lat: Double?, lon: Double?, timestamp: Timestamp?): Int
}
