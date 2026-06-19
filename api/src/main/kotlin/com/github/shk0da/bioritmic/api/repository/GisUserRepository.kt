package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.ApiConfiguration.Companion.defaultZone
import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.readTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.model.search.Gender
import io.r2dbc.spi.ConnectionFactory
import kotlinx.coroutines.reactive.awaitFirstOrNull
import org.slf4j.LoggerFactory
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDateTime

@Repository
@Transactional(transactionManager = readTransactionManager)
class GisUserRepository(private val slaveConnectionFactory: ConnectionFactory) {

    private val log = LoggerFactory.getLogger(GisUserRepository::class.java)
    private val databaseClient: DatabaseClient by lazy { DatabaseClient.create(slaveConnectionFactory) }

    private val maxLimit = 500

    suspend fun findNearest(
        userId: Long,
        lat: Double, lon: Double,
        distanceInKilometers: Double,
        gender: Gender? = null, ageMin: Int? = null, ageMax: Int? = null
    ): List<GisUser> {
        var sql = """
            SELECT usr.id, usr.name, usr.birthday, usr.gender, gis.lat, gis.lon, gis.distance
            FROM users AS usr, (SELECT *, (point(lat, lon) <@> point(:lat, :lon)) AS distance FROM gis_data ORDER BY distance) AS gis
            WHERE gis.user_id <> :userId AND gis.distance <= :distance AND usr.id = gis.user_id
        """.trimIndent()

        val params = mutableMapOf<String, Any>(
            "userId" to userId,
            "lat" to lat,
            "lon" to lon,
            "distance" to distanceInKilometers
        )

        if (gender != null) {
            sql += " AND usr.gender = :gender"
            params["gender"] = gender.ordinal.toShort()
        }
        if (ageMin != null) {
            sql += " AND usr.birthday <= :ageMin"
            val calendar = java.util.Calendar.getInstance()
            calendar.add(java.util.Calendar.YEAR, -ageMin)
            params["ageMin"] = Instant.ofEpochMilli(calendar.timeInMillis)
        }
        if (ageMax != null) {
            sql += " AND usr.birthday >= :ageMax"
            val calendar = java.util.Calendar.getInstance()
            calendar.add(java.util.Calendar.YEAR, -(ageMax + 1))
            params["ageMax"] = Instant.ofEpochMilli(calendar.timeInMillis)
        }

        sql += " ORDER BY gis.distance LIMIT $maxLimit"

        log.debug("Executing SQL statement [$sql], params: $params")

        val result = databaseClient.sql(sql)
            .let { query ->
                params.entries.fold(query) { acc, entry -> acc.bind(entry.key, entry.value) }
            }
            .fetch()
            .all()
            .map { row ->
                GisUser().apply {
                    this.id = row["id"] as? Long
                    this.name = row["name"] as? String
                    this.birthday = (row["birthday"] as? LocalDateTime)?.let { Timestamp.from(it.toInstant(defaultZone)) }
                    this.gender = (row["gender"] as? Number)?.toShort()
                    this.lat = (row["lat"] as? Double) ?: (row["lat"] as? Number)?.toDouble()
                    this.lon = (row["lon"] as? Double) ?: (row["lon"] as? Number)?.toDouble()
                    this.distance = (row["distance"] as? Double) ?: (row["distance"] as? Number)?.toDouble()
                }
            }
            .collectList()
            .awaitFirstOrNull() ?: emptyList()

        return result
    }
}
