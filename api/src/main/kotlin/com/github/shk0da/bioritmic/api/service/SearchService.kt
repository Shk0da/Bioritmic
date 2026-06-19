package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.repository.GisDataRepository
import com.github.shk0da.bioritmic.api.repository.GisUserRepository
import org.slf4j.LoggerFactory
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
            val gisUser = gisDataRepository.findById(search.userId!!) ?: throw ApiException(ErrorCode.COORDINATES_NOT_FOUND)
            val results = gisUserRepository.findNearest(
                gisUser.userId!!,
                gisUser.lat!!, gisUser.lon!!,
                search.distance,
                search.gender, search.ageMin, search.ageMax
            )
            val boosted = mutableSetOf<Long>()
            val notBoosted = mutableListOf<GisUser>()
            for (user in results) {
                val userId = user.id ?: continue
                if (boostService.isBoosted(userId)) {
                    boosted.add(userId)
                } else {
                    notBoosted.add(user)
                }
            }
            val boostedUsers = results.filter { it.id in boosted }
            boostedUsers + notBoosted
        } catch (ex: Exception) {
            log.error("Failed get nearest users for [{}]: {}", search, ex.message)
            emptyList()
        }
    }
}
