package com.github.shk0da.bioritmic.api.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.constants.GeoCountries
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.model.gis.GeoLocationDetailsModel
import com.github.shk0da.bioritmic.api.model.gis.GeoPlaceModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

@Service
class GeoPlaceService(
    private val objectMapper: ObjectMapper
) {
    private val log = LoggerFactory.getLogger(GeoPlaceService::class.java)

    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()

    private val searchCache = ConcurrentHashMap<String, List<GeoPlaceModel>>()
    private val reverseCache = ConcurrentHashMap<String, GeoLocationDetailsModel>()

    companion object {
        private const val NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
        private const val USER_AGENT = "Bioritmic/1.0 (https://bioritmic.ru)"
        private const val MIN_QUERY_LENGTH = 2
        private const val MAX_RESULTS = 10
        private val PLACE_TYPES = setOf("city", "town", "village", "hamlet", "municipality", "suburb")
    }

    suspend fun searchPlaces(countryCode: String, query: String): List<GeoPlaceModel> = withContext(Dispatchers.IO) {
        val normalizedCountry = countryCode.trim().lowercase()
        val normalizedQuery = query.trim()
        if (normalizedQuery.length < MIN_QUERY_LENGTH) {
            return@withContext emptyList()
        }
        if (GeoCountries.findByCode(normalizedCountry) == null) {
            throw ApiException("Неизвестный код страны")
        }

        val cacheKey = "$normalizedCountry:$normalizedQuery.lowercase()"
        searchCache[cacheKey]?.let { return@withContext it }

        val encodedQuery = URLEncoder.encode(normalizedQuery, StandardCharsets.UTF_8)
        val url = "$NOMINATIM_BASE_URL/search?format=json&addressdetails=1&limit=$MAX_RESULTS" +
            "&countrycodes=$normalizedCountry&q=$encodedQuery&accept-language=ru"
        val body = executeGet(url)
        val places = parseSearchResults(body, normalizedCountry.uppercase())
        searchCache[cacheKey] = places
        places
    }

    suspend fun reverseGeocode(lat: Double, lon: Double): GeoLocationDetailsModel = withContext(Dispatchers.IO) {
        val cacheKey = "${"%.5f".format(lat)}:${"%.5f".format(lon)}"
        reverseCache[cacheKey]?.let { return@withContext it }

        val url = "$NOMINATIM_BASE_URL/reverse?format=json&addressdetails=1&accept-language=ru&lat=$lat&lon=$lon"
        val body = executeGet(url)
        val details = parseReverseResult(body, lat, lon)
        reverseCache[cacheKey] = details
        details
    }

    internal fun buildSearchUrl(countryCode: String, query: String): String {
        val encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8)
        return "$NOMINATIM_BASE_URL/search?format=json&addressdetails=1&limit=$MAX_RESULTS" +
            "&countrycodes=${countryCode.lowercase()}&q=$encodedQuery&accept-language=ru"
    }

    internal fun parseSearchResults(body: String, countryCode: String): List<GeoPlaceModel> {
        val root = objectMapper.readTree(body)
        if (!root.isArray) {
            return emptyList()
        }

        val results = mutableListOf<GeoPlaceModel>()
        val seen = mutableSetOf<String>()
        root.forEach { node ->
            val place = toPlaceModel(node, countryCode) ?: return@forEach
            val key = "${place.name.lowercase()}|${"%.4f".format(place.lat)}|${"%.4f".format(place.lon)}"
            if (seen.add(key)) {
                results.add(place)
            }
        }
        return results
    }

    internal fun parseReverseResult(body: String, lat: Double, lon: Double): GeoLocationDetailsModel {
        val node = objectMapper.readTree(body)
        val address = node.path("address")
        val placeName = extractPlaceName(address)
        val countryCode = address.path("country_code").asText(null)?.uppercase()
        val countryName = address.path("country").asText(null)
            ?: countryCode?.let { code -> GeoCountries.findByCode(code)?.name }
        val displayName = node.path("display_name").asText(null)
            ?: listOfNotNull(placeName, countryName).joinToString(", ")

        return GeoLocationDetailsModel(
            countryCode = countryCode,
            countryName = countryName,
            placeName = placeName,
            displayName = displayName.ifBlank { null },
            lat = lat,
            lon = lon
        )
    }

    private fun executeGet(url: String): String {
        val request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(8))
            .header("User-Agent", USER_AGENT)
            .header("Accept-Language", "ru")
            .GET()
            .build()

        val response = try {
            httpClient.send(request, HttpResponse.BodyHandlers.ofString())
        } catch (exception: Exception) {
            log.warn("Geo place lookup failed for url={}", url, exception)
            throw ApiException("Не удалось выполнить поиск населённых пунктов")
        }

        if (response.statusCode() != 200) {
            log.warn("Geo place lookup returned status {} for url={}", response.statusCode(), url)
            throw ApiException("Не удалось выполнить поиск населённых пунктов")
        }
        return response.body()
    }

    private fun toPlaceModel(node: JsonNode, fallbackCountryCode: String): GeoPlaceModel? {
        if (node.path("class").asText() != "place") {
            return null
        }
        val type = node.path("type").asText()
        if (type !in PLACE_TYPES) {
            return null
        }

        val address = node.path("address")
        val name = extractPlaceName(address) ?: node.path("name").asText(null) ?: return null
        val lat = node.path("lat").asText(null)?.toDoubleOrNull() ?: return null
        val lon = node.path("lon").asText(null)?.toDoubleOrNull() ?: return null
        val countryCode = address.path("country_code").asText(fallbackCountryCode).uppercase()
        val region = address.path("state").asText(null)
            ?: address.path("region").asText(null)
            ?: address.path("county").asText(null)
        val displayName = listOfNotNull(name, region).joinToString(", ")

        return GeoPlaceModel(
            name = name,
            displayName = displayName,
            lat = lat,
            lon = lon,
            countryCode = countryCode,
            type = type
        )
    }

    private fun extractPlaceName(address: JsonNode): String? {
        return sequenceOf("city", "town", "village", "hamlet", "municipality", "suburb", "locality")
            .mapNotNull { field -> address.path(field).asText(null)?.takeIf { it.isNotBlank() } }
            .firstOrNull()
    }
}
