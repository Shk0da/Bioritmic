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
import java.util.concurrent.ConcurrentLinkedQueue

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
        private const val PHOTON_BASE_URL = "https://photon.komoot.io"
        private const val USER_AGENT = "Bioritmic/1.0 (https://bioritmic.ru)"
        private const val MIN_QUERY_LENGTH = 2
        private const val MAX_RESULTS = 10
        private const val MAX_FETCH_RESULTS = 20
        private val PLACE_TYPES = setOf(
            "city",
            "town",
            "village",
            "hamlet",
            "municipality",
            "suburb",
            "locality"
        )
        private val PLACE_ADDRESS_TYPES = PLACE_TYPES
        private val PHOTON_PLACE_TYPES = PLACE_TYPES
        private val TYPE_PRIORITY = mapOf(
            "city" to 0,
            "town" to 1,
            "municipality" to 2,
            "village" to 3,
            "hamlet" to 4,
            "suburb" to 5,
            "locality" to 6
        )
        private const val UNKNOWN_TYPE_PRIORITY = 99
        private const val STATUS_OK = 200
        private const val MATCH_EXACT = 0
        private const val MATCH_PREFIX = 1
        private const val MATCH_CONTAINS = 2
        private const val MATCH_NONE = 3
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

        val cacheKey = "$normalizedCountry:${normalizedQuery.lowercase()}"
        searchCache[cacheKey]?.let { return@withContext it }

        var nominatimError: Exception? = null
        val nominatimPlaces = try {
            fetchNominatimPlaces(normalizedCountry, normalizedQuery)
        } catch (exception: Exception) {
            nominatimError = exception
            log.warn(
                "Nominatim place lookup failed for country={} query={}",
                normalizedCountry, normalizedQuery, exception
            )
            emptyList()
        }
        val photonPlaces = fetchPhotonPlaces(normalizedCountry.uppercase(), normalizedQuery)
        if (nominatimPlaces.isEmpty() && photonPlaces.isEmpty() && nominatimError != null) {
            throw ApiException("Не удалось выполнить поиск населённых пунктов")
        }

        val places = mergeAndRankPlaces(nominatimPlaces + photonPlaces, normalizedQuery).take(MAX_RESULTS)
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
        return "$NOMINATIM_BASE_URL/search?format=json&addressdetails=1&limit=$MAX_FETCH_RESULTS" +
            "&countrycodes=${countryCode.lowercase()}&q=$encodedQuery&accept-language=ru"
    }

    internal fun buildPhotonSearchUrl(query: String): String {
        val encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8)
        return "$PHOTON_BASE_URL/api/?q=$encodedQuery&limit=$MAX_FETCH_RESULTS"
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
            val key = placeKey(place)
            if (seen.add(key)) {
                results.add(place)
            }
        }
        return results
    }

    internal fun parsePhotonResults(body: String, countryCode: String): List<GeoPlaceModel> {
        val features = objectMapper.readTree(body).path("features")
        if (!features.isArray) {
            return emptyList()
        }

        val results = mutableListOf<GeoPlaceModel>()
        val seen = mutableSetOf<String>()
        features.forEach { feature ->
            val place = toPhotonPlaceModel(feature, countryCode) ?: return@forEach
            val key = placeKey(place)
            if (seen.add(key)) {
                results.add(place)
            }
        }
        return results
    }

    internal fun mergeAndRankPlaces(places: List<GeoPlaceModel>, query: String): List<GeoPlaceModel> {
        val normalizedQuery = query.trim().lowercase()
        val seen = mutableSetOf<String>()
        return places
            .filter { place -> seen.add(placeKey(place)) }
            .sortedWith(
                compareBy<GeoPlaceModel>(
                    { place -> nameMatchRank(place.name, normalizedQuery) },
                    { place -> TYPE_PRIORITY[place.type] ?: UNKNOWN_TYPE_PRIORITY },
                    { place -> place.name.lowercase() }
                )
            )
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

    private fun fetchNominatimPlaces(countryCode: String, query: String): List<GeoPlaceModel> {
        val encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8)
        val country = countryCode.lowercase()
        val upperCountry = country.uppercase()
        val results = mutableListOf<GeoPlaceModel>()

        val freeTextUrl = "$NOMINATIM_BASE_URL/search?format=json&addressdetails=1&limit=$MAX_FETCH_RESULTS" +
            "&countrycodes=$country&q=$encodedQuery&accept-language=ru"
        executeGet(freeTextUrl).let { body ->
            results += parseSearchResults(body, upperCountry)
        }

        val structuredUrl = "$NOMINATIM_BASE_URL/search?format=json&addressdetails=1&limit=$MAX_FETCH_RESULTS" +
            "&countrycodes=$country&city=$encodedQuery&accept-language=ru"
        executeGetOptional(structuredUrl)?.let { body ->
            results += parseSearchResults(body, upperCountry)
        }

        return results
    }

    private fun fetchPhotonPlaces(countryCode: String, query: String): List<GeoPlaceModel> {
        return try {
            val body = executeGetOptional(buildPhotonSearchUrl(query)) ?: return emptyList()
            parsePhotonResults(body, countryCode)
        } catch (exception: Exception) {
            log.warn("Photon place lookup failed for country={} query={}", countryCode, query, exception)
            emptyList()
        }
    }

    private fun executeGet(url: String): String {
        val response = sendGet(url)
        if (response.statusCode() != 200) {
            log.warn("Geo place lookup returned status {} for url={}", response.statusCode(), url)
            throw ApiException("Не удалось выполнить поиск населённых пунктов")
        }
        return response.body()
    }

    private fun executeGetOptional(url: String): String? {
        val response = try {
            sendGet(url)
        } catch (exception: Exception) {
            log.warn("Geo place lookup failed for url={}", url, exception)
            return null
        }
        if (response.statusCode() != 200) {
            log.warn("Geo place lookup returned status {} for url={}", response.statusCode(), url)
            return null
        }
        return response.body()
    }

    private fun sendGet(url: String): HttpResponse<String> {
        val request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(8))
            .header("User-Agent", USER_AGENT)
            .header("Accept-Language", "ru")
            .GET()
            .build()

        return try {
            httpClient.send(request, HttpResponse.BodyHandlers.ofString())
        } catch (exception: Exception) {
            log.warn("Geo place lookup failed for url={}", url, exception)
            throw ApiException("Не удалось выполнить поиск населённых пунктов")
        }
    }

    @Suppress("ReturnCount")
    private fun toPlaceModel(node: JsonNode, fallbackCountryCode: String): GeoPlaceModel? {
        if (!isAcceptableNominatimResult(node)) {
            return null
        }

        val clazz = node.path("class").asText()
        val address = node.path("address")
        val name = extractPlaceName(address) ?: node.path("name").asText(null) ?: return null
        val lat = node.path("lat").asText(null)?.toDoubleOrNull() ?: return null
        val lon = node.path("lon").asText(null)?.toDoubleOrNull() ?: return null
        val countryCode = address.path("country_code").asText(fallbackCountryCode).uppercase()
        val region = address.path("state").asText(null)
            ?: address.path("region").asText(null)
            ?: address.path("county").asText(null)
        val type = when {
            clazz == "boundary" -> node.path("addresstype").asText("city")
            else -> node.path("type").asText()
        }

        return GeoPlaceModel(
            name = name,
            displayName = listOfNotNull(name, region).joinToString(", "),
            lat = lat,
            lon = lon,
            countryCode = countryCode,
            type = type
        )
    }

    @Suppress("ReturnCount")
    private fun toPhotonPlaceModel(feature: JsonNode, countryCode: String): GeoPlaceModel? {
        val properties = feature.path("properties")
        val resultCountryCode = properties.path("countrycode").asText(null)?.uppercase() ?: return null
        if (resultCountryCode != countryCode.uppercase()) {
            return null
        }

        val type = properties.path("type").asText(null) ?: return null
        if (type !in PHOTON_PLACE_TYPES) {
            return null
        }

        val name = properties.path("name").asText(null)?.takeIf { it.isNotBlank() } ?: return null
        val coordinates = feature.path("geometry").path("coordinates")
        if (!coordinates.isArray || coordinates.size() < 2) {
            return null
        }

        val lon = coordinates.get(0).asDouble()
        val lat = coordinates.get(1).asDouble()
        val region = properties.path("state").asText(null)
            ?: properties.path("county").asText(null)

        return GeoPlaceModel(
            name = name,
            displayName = listOfNotNull(name, region).joinToString(", "),
            lat = lat,
            lon = lon,
            countryCode = resultCountryCode,
            type = type
        )
    }

    private fun isAcceptableNominatimResult(node: JsonNode): Boolean {
        val clazz = node.path("class").asText()
        val type = node.path("type").asText()
        return when {
            clazz == "place" && type in PLACE_TYPES -> true
            clazz == "boundary" && type == "administrative" -> {
                node.path("addresstype").asText(null) in PLACE_ADDRESS_TYPES
            }
            else -> false
        }
    }

    private fun extractPlaceName(address: JsonNode): String? {
        return sequenceOf("city", "town", "village", "hamlet", "municipality", "suburb", "locality", "settlement")
            .mapNotNull { field -> address.path(field).asText(null)?.takeIf { it.isNotBlank() } }
            .firstOrNull()
    }

    private fun placeKey(place: GeoPlaceModel): String {
        return "${place.name.lowercase()}|${"%.3f".format(place.lat)}|${"%.3f".format(place.lon)}"
    }

    private fun nameMatchRank(name: String, query: String): Int {
        val normalizedName = name.lowercase()
        return when {
            normalizedName == query -> MATCH_EXACT
            normalizedName.startsWith(query) -> MATCH_PREFIX
            normalizedName.contains(query) -> MATCH_CONTAINS
            else -> MATCH_NONE
        }
    }
}

/**
 * Simple bounded FIFO cache with TTL to prevent memory leaks.
 * Evicts oldest entries when maxSize is exceeded (insertion order, not LRU).
 * Thread-safe via ConcurrentHashMap.
 */
class BoundedCache<K, V>(
    private val maxSize: Int,
    private val ttlSeconds: Long,
) {
    private val delegate = ConcurrentHashMap<K, CacheEntry<V>>()
    private val insertionOrder = ConcurrentLinkedQueue<K>()

    private data class CacheEntry<V>(val value: V, val expiresAt: Long)

    @Suppress("ReturnCount")
    operator fun get(key: K): V? {
        val entry = delegate[key] ?: return null
        if (System.currentTimeMillis() > entry.expiresAt) {
            delegate.remove(key)
            return null
        }
        return entry.value
    }

    operator fun set(key: K, value: V) {
        evictExpired()
        while (delegate.size >= maxSize) {
            val oldest = insertionOrder.poll() ?: break
            delegate.remove(oldest)
        }
        val expiresAt = System.currentTimeMillis() + ttlSeconds * 1000
        if (delegate.put(key, CacheEntry(value, expiresAt)) == null) {
            insertionOrder.add(key)
        }
    }

    private fun evictExpired() {
        val now = System.currentTimeMillis()
        delegate.entries.removeAll { it.value.expiresAt <= now }
        insertionOrder.removeIf { !delegate.containsKey(it) }
    }
}
