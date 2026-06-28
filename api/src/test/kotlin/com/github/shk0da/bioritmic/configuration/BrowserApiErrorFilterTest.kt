package com.github.shk0da.bioritmic.configuration

import com.github.shk0da.bioritmic.api.configuration.BrowserApiErrorFilter
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.mock.http.server.reactive.MockServerHttpRequest

class BrowserApiErrorFilterTest {

    @Test
    fun `should detect browser navigation by Sec-Fetch-Dest`() {
        val request = MockServerHttpRequest.get("/api/v1/photos/s3/test.jpg")
            .header("Sec-Fetch-Dest", "document")
            .build()

        assertTrue(BrowserApiErrorFilter.isBrowserNavigation(request))
    }

    @Test
    fun `should not treat API fetch as browser navigation`() {
        val request = MockServerHttpRequest.get("/api/v1/user/me")
            .header("Sec-Fetch-Dest", "empty")
            .header("Sec-Fetch-Mode", "cors")
            .header("Accept", "application/json, text/plain, */*")
            .build()

        assertFalse(BrowserApiErrorFilter.isBrowserNavigation(request))
    }

    @Test
    fun `should map HTTP status to error page code`() {
        assertEquals("401", BrowserApiErrorFilter.errorPageCode(HttpStatus.UNAUTHORIZED))
        assertEquals("403", BrowserApiErrorFilter.errorPageCode(HttpStatus.FORBIDDEN))
        assertEquals("404", BrowserApiErrorFilter.errorPageCode(HttpStatus.NOT_FOUND))
        assertEquals("500", BrowserApiErrorFilter.errorPageCode(HttpStatus.INTERNAL_SERVER_ERROR))
    }
}
