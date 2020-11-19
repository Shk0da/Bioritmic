package com.github.shk0da.bioritmic.api.model

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.google.common.collect.ImmutableMap
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.domain.Sort.unsorted

class PageableRequest @JvmOverloads constructor(page: Int = 1, size: Int = 100, sort: Sort? = unsorted()) : PageRequest(page - 1, size, sort!!), Pageable {

    companion object {
        fun of(pageable: Pageable?): PageableRequest {
            if (null == pageable) return PageableRequest()

            if (pageable.pageNumber < 0) {
                throw ApiException(ErrorCode.INVALID_PARAMETER, ImmutableMap.of(ErrorCode.Constants.PARAMETER_NAME, "page"))
            }
            val pageNumber = if (pageable.pageNumber > 0) pageable.pageNumber else 1

            if (pageable.pageSize <= 0 || pageable.pageSize > 100) {
                throw ApiException(
                        ErrorCode.INVALID_PARAMETER_RANGE,
                        ImmutableMap.of(
                                ErrorCode.Constants.PARAMETER_NAME, "size",
                                ErrorCode.Constants.PARAMETER_VALUE_START, "0",
                                ErrorCode.Constants.PARAMETER_VALUE_END, "100"
                        ))
            }

            return PageableRequest(pageNumber, pageable.pageSize, pageable.sort)
        }
    }
}