package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.readTransactionManager

import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.model.search.Gender
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.sql.Connection
import java.sql.PreparedStatement
import java.sql.Timestamp
import java.util.*
import javax.sql.DataSource

@Repository
@Transactional(transactionManager = readTransactionManager)
class GisUserJpaRepository(val slaveDataSource: DataSource) {

    private val log = LoggerFactory.getLogger(GisUserJpaRepository::class.java)

    private val maxLimit = 500

    private val searchQuery = "SELECT usr.id, usr.name, usr.birthday, usr.gender, gis.lat, gis.lon, gis.distance " +
        "FROM users AS usr, (SELECT *, (point(lat, lon) <@> point($2, $3)) AS distance FROM gis_data ORDER BY distance) AS gis " +
        "WHERE gis.user_id <> $1 AND gis.distance <= $4 AND usr.id = gis.user_id AND gis.timestamp >= $5 order by gis.distance limit 100"

    fun findNearest(
        userId: Long,
        lat: Double, lon: Double,
        distanceInKilometers: Double, timestamp: Timestamp,
        gender: Gender? = null, ageMin: Int? = null, ageMax: Int? = null
    ): List<GisUser> {
        val connection = slaveDataSource.connection
        try {
            val statement = createSearchStatement(
                slaveDataSource.connection,
                userId, lat, lon,
                distanceInKilometers, timestamp,
                gender, ageMin, ageMax
            )
            val resultSet = statement.executeQuery()
            val result = mutableListOf<GisUser>()
            while (resultSet.next()) {
                result.add(mapGisUser(resultSet))
            }
            return result
        } finally {
            connection.close()
        }
    }

    private fun createSearchStatement(
        connection: Connection,
        userId: Long, lat: Double, lon: Double,
        distanceInKilometers: Double, timestamp: Timestamp,
        gender: Gender?, ageMin: Int?, ageMax: Int?
    ): PreparedStatement {
        var conditional = ""
        var conditionalIndex = 6
        val conditionalMap: HashMap<String, Int> = HashMap(3)
        if (null != gender) {
            val index = conditionalIndex++
            conditional += " and usr.gender = ?"
            conditionalMap["gender"] = index
        }
        if (null != ageMin) {
            val index = conditionalIndex++
            conditional += " and usr.birthday <= ?"
            conditionalMap["ageMin"] = index
        }
        if (null != ageMax) {
            val index = conditionalIndex
            conditional += " and usr.birthday >= ?"
            conditionalMap["ageMax"] = index
        }
        val limit = " limit $maxLimit"

        val sql = "$searchQuery$conditional$limit"
        var debugMsg = "Executing SQL statement [$sql], [$userId, $lat, $lon, $distanceInKilometers, $timestamp"
        val statement = connection.prepareStatement(sql)
        statement.setLong(1, userId)
        statement.setDouble(2, lat)
        statement.setDouble(3, lon)
        statement.setDouble(4, distanceInKilometers)
        statement.setTimestamp(5, timestamp)
        if (null != gender) {
            val bindGender = gender.ordinal
            statement.setInt(conditionalMap["gender"]!!, bindGender)
            debugMsg += ", $bindGender"
        }
        if (null != ageMin) {
            val calendar = Calendar.getInstance()
            calendar.add(Calendar.YEAR, -ageMin)
            val bindAgeMin = Timestamp(calendar.time.time)
            statement.setTimestamp(conditionalMap["ageMin"]!!, bindAgeMin)
            debugMsg += ", $bindAgeMin"
        }
        if (null != ageMax) {
            val calendar = Calendar.getInstance()
            calendar.add(Calendar.YEAR, -(ageMax + 1))
            val bindAgeMax = Timestamp(calendar.time.time)
            statement.setTimestamp(conditionalMap["ageMax"]!!, bindAgeMax)
            debugMsg += ", $bindAgeMax"
        }
        debugMsg += "]"
        log.debug(debugMsg)
        return statement
    }

    private fun mapGisUser(resultSet: java.sql.ResultSet): GisUser {
        val gisUser = GisUser()
        gisUser.id = resultSet.getLong("id")
        gisUser.name = resultSet.getString("name")
        gisUser.birthday = resultSet.getTimestamp("birthday")
        gisUser.gender = resultSet.getShort("gender")
        gisUser.lat = resultSet.getBigDecimal("lat")?.toDouble()
        gisUser.lon = resultSet.getBigDecimal("lon")?.toDouble()
        gisUser.distance = resultSet.getBigDecimal("distance")?.toDouble()
        return gisUser
    }
}
