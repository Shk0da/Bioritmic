package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisUser
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.r2dbc.repository.R2dbcRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux

@Repository
@Transactional(transactionManager = r2dbcTransactionManager)
interface GisUserR2dbcRepository : R2dbcRepository<GisUser, Long> {

    @Transactional(readOnly = true)
    @Query("SELECT usr.id, usr.name, usr.birthday, gis.lat, gis.lon, gis.distance " +
            "FROM users AS usr, (SELECT *, (point(lat, lon) <@> point(:lat, :lon)) AS distance FROM gis_data ORDER BY distance) AS gis " +
            "WHERE gis.user_id <> :userId AND gis.distance <= :distanceInKilometers AND usr.id = gis.user_id")
    fun findNearest(userId: Long, lat: Double, lon: Double, distanceInKilometers: Double): Flux<GisUser>
}