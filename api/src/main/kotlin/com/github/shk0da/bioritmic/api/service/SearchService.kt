package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.repository.GisDataRepository
import com.github.shk0da.bioritmic.api.repository.GisUserRepository
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SearchService(
    val gisDataRepository: GisDataRepository,
    val gisUserRepository: GisUserRepository,
    val boostService: BoostService
) {

    private val log = LoggerFactory.getLogger(SearchService::class.java)

    @Transactional(readOnly = true)
    suspend fun searchByFilter(search: UserSearch): List<GisUser> {
        return try {
            val gisUser = gisDataRepository.findById(search.userId!!)
                ?: throw ApiException(ErrorCode.COORDINATES_NOT_FOUND)
            val results = gisUserRepository.findNearest(
                gisUser.userId!!,
                gisUser.lat!!, gisUser.lon!!,
                search.distance,
                search.gender, search.ageMin, search.ageMax
            )

            val allUserIds = results.mapNotNull { it.id }.toSet()
            val boostedIds = boostService.getBoostedUserIds(allUserIds)

            val boostedUsers = results.filter { it.id in boostedIds }
            val notBoosted = results.filter { it.id !in boostedIds }
            boostedUsers + notBoosted
        } catch (ex: DataAccessException) {
            log.error("Failed get nearest users for [{}]: {}", search, ex.message)
            emptyList()
        }
    }
}
