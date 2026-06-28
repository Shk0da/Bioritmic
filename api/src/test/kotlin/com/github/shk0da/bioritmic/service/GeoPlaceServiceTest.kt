package com.github.shk0da.bioritmic.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.service.GeoPlaceService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class GeoPlaceServiceTest {

    private val service = GeoPlaceService(ObjectMapper())

  @Test
    fun buildSearchUrlEncodesQueryAndCountry() {
        val url = service.buildSearchUrl("RU", "Санкт")
        assertTrue(url.contains("countrycodes=ru"))
        assertTrue(url.contains("accept-language=ru"))
        assertTrue(url.contains("q="))
    }

    @Test
    fun parseSearchResultsReturnsUniquePlaces() {
        val body = """
            [
              {
                "class": "place",
                "type": "city",
                "name": "Москва",
                "lat": "55.7558",
                "lon": "37.6173",
                "address": {
                  "city": "Москва",
                  "state": "Москва",
                  "country_code": "ru"
                }
              },
              {
                "class": "place",
                "type": "city",
                "name": "Москва",
                "lat": "55.7558",
                "lon": "37.6173",
                "address": {
                  "city": "Москва",
                  "state": "Москва",
                  "country_code": "ru"
                }
              },
              {
                "class": "highway",
                "type": "residential",
                "name": "Ignored",
                "lat": "1",
                "lon": "2",
                "address": {}
              }
            ]
        """.trimIndent()

        val places = service.parseSearchResults(body, "RU")
        assertEquals(1, places.size)
        assertEquals("Москва", places.first().name)
        assertEquals(55.7558, places.first().lat)
        assertEquals("RU", places.first().countryCode)
    }

    @Test
    fun parseReverseResultExtractsCityAndCountry() {
        val body = """
            {
              "display_name": "Москва, Россия",
              "address": {
                "city": "Москва",
                "country": "Россия",
                "country_code": "ru"
              }
            }
        """.trimIndent()

        val details = service.parseReverseResult(body, 55.75, 37.61)
        assertEquals("RU", details.countryCode)
        assertEquals("Москва", details.placeName)
        assertEquals(55.75, details.lat)
    }
}
