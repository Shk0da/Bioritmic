package com.github.shk0da.bioritmic.api.repository.r2dbc

import com.github.shk0da.bioritmic.api.configuration.ApiConfiguration.Companion.defaultZone
import com.github.shk0da.bioritmic.api.configuration.datasource.R2dbcConfiguration.Companion.r2dbcTransactionManager
import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.model.search.Gender
import io.r2dbc.spi.Connection
import io.r2dbc.spi.ConnectionFactory
import io.r2dbc.spi.Row
import io.r2dbc.spi.Statement
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import java.math.BigDecimal
import java.math.BigInteger
import java.sql.Timestamp
import java.time.LocalDateTime
import java.util.*
import kotlin.collections.HashMap

@Repository
@Transactional(transactionManager = r2dbcTransactionManager)
class GisUserR2dbcRepository(val slaveConnectionFactory: ConnectionFactory) {

    private val log = LoggerFactory.getLogger(GisUserR2dbcRepository::class.java)

    private val maxLimit = 500

    private val searchQuery = "SELECT usr.id, usr.name, usr.birthday, usr.gender, gis.lat, gis.lon, gis.distance " +
            "FROM users AS usr, (SELECT *, (point(lat, lon) <@> point($2, $3)) AS distance FROM gis_data ORDER BY distance) AS gis " +
            "WHERE gis.user_id <> $1 AND gis.distance <= $4 AND usr.id = gis.user_id AND gis.timestamp >= $5 order by gis.distance limit 100"

    fun findNearest(userId: Long,
                    lat: Double, lon: Double,
                    distanceInKilometers: Double, timestamp: Timestamp,
                    gender: Gender? = null, ageMin: Int? = null, ageMax: Int? = null): Flux<GisUser> {
        return Flux.from(slaveConnectionFactory.create())
                .flatMap { connection ->
                    val statement = createSearchStatement(
                            connection,
                            userId, lat, lon,
                            distanceInKilometers, timestamp,
                            gender, ageMin, ageMax
                    )
                    Flux.from(statement.execute()).doFinally { connection.close() }
                }
                .map { result -> result.map { row, _ -> mapGisUser(row) } }
                .flatMap { it }
    }

    private fun createSearchStatement(connection: Connection,
                                      userId: Long, lat: Double, lon: Double,
                                      distanceInKilometers: Double, timestamp: Timestamp,
                                      gender: Gender?, ageMin: Int?, ageMax: Int?): Statement {
        var conditional = ""
        var conditionalIndex = 6
        val conditionalMap: HashMap<String, String> = HashMap(3)
        if (null != gender) {
            val index = "$${conditionalIndex++}"
            conditional += " and usr.gender = $index"
            conditionalMap["gender"] = index
        }
        if (null != ageMin) {
            val index = "$${conditionalIndex++}"
            conditional += " and usr.birthday <= $index"
            conditionalMap["ageMin"] = index
        }
        if (null != ageMax) {
            val index = "$${conditionalIndex}"
            conditional += " and usr.birthday >= $index"
            conditionalMap["ageMax"] = index
        }
        val limit = " limit $maxLimit"

        val sql = "$searchQuery$conditional$limit"
        var debugMsg = "Executing SQL statement [$sql], [$userId, $lat, $lon, $distanceInKilometers, $timestamp"
        val statement = connection.createStatement(sql)
                .bind("$1", userId)
                .bind("$2", lat)
                .bind("$3", lon)
                .bind("$4", distanceInKilometers)
                .bind("$5", timestamp)
        if (null != gender) {
            val bindGender = gender.ordinal
            statement.bind(conditionalMap["gender"]!!, bindGender)
            debugMsg += ", $bindGender"
        }
        if (null != ageMin) {
            val calendar = Calendar.getInstance()
            calendar.add(Calendar.YEAR, -ageMin)
            val bindAgeMin = Timestamp(calendar.time.time)
            statement.bind(conditionalMap["ageMin"]!!, bindAgeMin)
            debugMsg += ", $bindAgeMin"
        }
        if (null != ageMax) {
            val calendar = Calendar.getInstance()
            calendar.add(Calendar.YEAR, -(ageMax + 1))
            val bindAgeMax = Timestamp(calendar.time.time)
            statement.bind(conditionalMap["ageMax"]!!, bindAgeMax)
            debugMsg += ", $bindAgeMax"
        }
        debugMsg += "]"
        log.debug(debugMsg)
        return statement
    }

    private fun mapGisUser(row: Row): GisUser {
        val gisUser = GisUser()
        gisUser.id = row["id", BigInteger::class.java]?.toLong()
        gisUser.name = row["name", String::class.java]
        gisUser.birthday = Timestamp(row["birthday", LocalDateTime::class.java]?.toInstant(defaultZone)!!.toEpochMilli())
        gisUser.gender = row["gender", Integer::class.java]?.toShort()
        gisUser.lat = row["lat", BigDecimal::class.java]?.toDouble()
        gisUser.lon = row["lon", BigDecimal::class.java]?.toDouble()
        gisUser.distance = row["distance", BigDecimal::class.java]?.toDouble()
        return gisUser
    }
}