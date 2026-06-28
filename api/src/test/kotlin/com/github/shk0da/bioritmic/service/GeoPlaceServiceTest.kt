package com.github.shk0da.bioritmic.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.model.gis.GeoPlaceModel
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
    fun buildPhotonSearchUrlEncodesQuery() {
        val url = service.buildPhotonSearchUrl("Новосиб")
        assertTrue(url.contains("photon.komoot.io"))
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
    fun parseSearchResultsAcceptsAdministrativeCityBoundary() {
        val body = """
            [
              {
                "class": "boundary",
                "type": "administrative",
                "addresstype": "city",
                "name": "Пушкин",
                "lat": "59.7203000",
                "lon": "30.4045000",
                "address": {
                  "city": "Пушкин",
                  "state": "Санкт-Петербург",
                  "country_code": "ru"
                }
              }
            ]
        """.trimIndent()

        val places = service.parseSearchResults(body, "RU")
        assertEquals(1, places.size)
        assertEquals("Пушкин", places.first().name)
        assertEquals("city", places.first().type)
    }

    @Test
    fun parseSearchResultsAcceptsLocality() {
        val body = """
            [
              {
                "class": "place",
                "type": "locality",
                "name": "Пушкинский",
                "lat": "54.2000",
                "lon": "56.1000",
                "address": {
                  "locality": "Пушкинский",
                  "state": "Башкортостан",
                  "country_code": "ru"
                }
              }
            ]
        """.trimIndent()

        val places = service.parseSearchResults(body, "RU")
        assertEquals(1, places.size)
        assertEquals("Пушкинский", places.first().name)
    }

    @Test
    fun parsePhotonResultsFiltersByCountryAndType() {
        val body = """
            {
              "features": [
                {
                  "geometry": { "coordinates": [82.9206, 55.0302] },
                  "properties": {
                    "name": "Новосибирск",
                    "type": "city",
                    "countrycode": "RU",
                    "state": "Новосибирская область"
                  }
                },
                {
                  "geometry": { "coordinates": [37.6173, 55.7558] },
                  "properties": {
                    "name": "Москва",
                    "type": "city",
                    "countrycode": "RU",
                    "state": "Москва"
                  }
                },
                {
                  "geometry": { "coordinates": [10.0, 50.0] },
                  "properties": {
                    "name": "Berlin",
                    "type": "city",
                    "countrycode": "DE"
                  }
                },
                {
                  "geometry": { "coordinates": [82.93, 55.04] },
                  "properties": {
                    "name": "Новосибирский университет",
                    "type": "house",
                    "countrycode": "RU"
                  }
                }
              ]
            }
        """.trimIndent()

        val places = service.parsePhotonResults(body, "RU")
        assertEquals(2, places.size)
        assertEquals("Новосибирск", places.first().name)
        assertEquals(55.0302, places.first().lat)
        assertEquals(82.9206, places.first().lon)
    }

    @Test
    fun mergeAndRankPlacesPrefersPrefixAndCityType() {
        val places = listOf(
            GeoPlaceModel("Пушкин", "Пушкин, Ростовская область", 47.0, 40.0, "RU", "hamlet"),
            GeoPlaceModel("Пушкин", "Пушкин, Санкт-Петербург", 59.72, 30.40, "RU", "city"),
            GeoPlaceModel("Пушкинский", "Пушкинский, Башкортостан", 54.2, 56.1, "RU", "locality")
        )

        val ranked = service.mergeAndRankPlaces(places, "Пушкин")
        assertEquals("Пушкин", ranked.first().name)
        assertEquals("city", ranked.first().type)
        assertEquals(3, ranked.size)
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
