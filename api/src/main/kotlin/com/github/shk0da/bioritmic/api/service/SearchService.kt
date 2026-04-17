package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.repository.GisDataJpaRepository
import com.github.shk0da.bioritmic.api.repository.GisUserJpaRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import kotlin.jvm.optionals.getOrNull

@Service
class SearchService(
    val gisDataJpaRepository: GisDataJpaRepository,
    val gisUserJpaRepository: GisUserJpaRepository
) {

    private val log = LoggerFactory.getLogger(SearchService::class.java)

    @Transactional(readOnly = true)
    fun searchByFilter(search: UserSearch): List<GisUser> {
        return try {
            val gisUser = gisDataJpaRepository.findById(search.userId!!).getOrNull() ?: throw ApiException(ErrorCode.COORDINATES_NOT_FOUND)
            gisUserJpaRepository.findNearest(
                gisUser.userId!!,
                gisUser.lat!!, gisUser.lon!!,
                search.distance, search.timestamp,
                search.gender, search.ageMin, search.ageMax
            )
        } catch (ex: Exception) {
            log.error("Failed get nearest users for [{}]: {}", search, ex.message)
            emptyList()
        }
    }
}
