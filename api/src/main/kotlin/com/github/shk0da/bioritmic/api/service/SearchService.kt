package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.GisUser
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.search.UserSearch
import com.github.shk0da.bioritmic.api.repository.r2dbc.GisDataR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.GisUserR2dbcRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono

@Service
class SearchService(val gisDataR2dbcRepository: GisDataR2dbcRepository,
                    val gisUserR2dbcRepository: GisUserR2dbcRepository) {

    private val log = LoggerFactory.getLogger(SearchService::class.java)

    @Transactional(readOnly = true)
    fun searchByFilter(search: UserSearch): Flux<GisUser> {
        return gisDataR2dbcRepository.findById(search.userId!!)
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.COORDINATES_NOT_FOUND)))
                .map {
                    gisUserR2dbcRepository.findNearest(
                            it.userId!!,
                            it.lat!!, it.lon!!,
                            search.distance, search.timestamp,
                            search.gender, search.ageMin, search.ageMax
                    )
                }
                .flatMapMany { it }
                .doOnError {
                    log.error("Failed get nearest users for [{}]: {}", search, it.message)
                }
    }
}
