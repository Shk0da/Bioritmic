package com.github.shk0da.bioritmic.api.model

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE_END
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE_START
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.domain.Sort.unsorted

class PageableRequest(
    private val pageNumber: Int = 1,
    private val pageSize: Int = 100,
    private val sort: Sort = unsorted()
) : Pageable {

    override fun getPageNumber(): Int = pageNumber - 1

    override fun getPageSize(): Int = pageSize

    override fun getSort(): Sort = sort

    override fun getOffset(): Long = getPageNumber().toLong() * pageSize

    override fun next(): Pageable = PageableRequest(getPageNumber() + 1, pageSize, sort)

    override fun previousOrFirst(): Pageable = PageableRequest(if (getPageNumber() > 1) getPageNumber() - 1 else 1, pageSize, sort)

    override fun first(): Pageable = PageableRequest(1, pageSize, sort)

    override fun withPage(page: Int): Pageable = PageableRequest(page + 1, pageSize, sort)

    override fun hasPrevious(): Boolean = getPageNumber() > 1

    companion object {
        fun of(pageable: Pageable?): PageableRequest {
            if (null == pageable) return PageableRequest()

            if (pageable.pageNumber < 0) {
                throw ApiException(ErrorCode.INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, "page")))
            }
            val pageNumber = if (pageable.pageNumber > 0) pageable.pageNumber else 1

            if (pageable.pageSize <= 0 || pageable.pageSize > 100) {
                throw ApiException(
                    ErrorCode.INVALID_PARAMETER_RANGE,
                    mapOf(
                        Pair(PARAMETER_NAME, "size"),
                        Pair(PARAMETER_VALUE_START, "0"),
                        Pair(PARAMETER_VALUE_END, "100")
                    )
                )
            }

            return PageableRequest(pageNumber, pageable.pageSize, pageable.sort)
        }
    }
}
