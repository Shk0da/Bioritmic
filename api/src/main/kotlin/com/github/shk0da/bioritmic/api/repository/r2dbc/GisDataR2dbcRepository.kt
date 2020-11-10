package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisData
import org.springframework.data.r2dbc.repository.Modifying
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Mono
import java.sql.Timestamp

@Repository
@Transactional(transactionManager = r2dbcTransactionManager)
interface GisDataR2dbcRepository : R2dbcRepository<GisData, Long> {

    @Modifying
    @Query("insert into gis_data(user_id, lat, lon, timestamp) " +
            "values (:userId, :lat, :lon, :timestamp) " +
            "on conflict (user_id) do update " +
            "set lat = excluded.lat, lon = excluded.lon, timestamp = excluded.timestamp")
    fun insert(userId: Long?, lat: Double?, lon: Double?, timestamp: Timestamp?): Mono<Int>
}