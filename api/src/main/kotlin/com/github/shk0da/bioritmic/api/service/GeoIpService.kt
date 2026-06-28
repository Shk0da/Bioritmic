package com.github.shk0da.bioritmic.api.service

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.model.gis.GisEstimateModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

@Service
class GeoIpService(
    private val objectMapper: ObjectMapper
) {
    private val log = LoggerFactory.getLogger(GeoIpService::class.java)

    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()

    suspend fun estimateLocation(clientIp: String?): GisEstimateModel = withContext(Dispatchers.IO) {
        val url = buildLookupUrl(clientIp)
        val request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(Duration.ofSeconds(5))
            .GET()
            .build()

        val response = try {
            httpClient.send(request, HttpResponse.BodyHandlers.ofString())
        } catch (exception: Exception) {
            log.warn("GeoIP lookup failed for url={}", url, exception)
            throw ApiException("Не удалось определить местоположение по IP")
        }

        if (response.statusCode() != 200) {
            log.warn("GeoIP lookup returned status {} for url={}", response.statusCode(), url)
            throw ApiException("Не удалось определить местоположение по IP")
        }

        parseResponse(response.body())
    }

    internal fun buildLookupUrl(clientIp: String?): String {
        val fields = "?fields=status,message,lat,lon"
        val ip = clientIp?.trim()
        return if (ip.isNullOrBlank() || isLocalOrPrivateIp(ip)) {
            "http://ip-api.com/json$fields"
        } else {
            "http://ip-api.com/json/$ip$fields"
        }
    }

    internal fun isLocalOrPrivateIp(ip: String): Boolean {
        if (ip == "127.0.0.1" || ip == "::1" || ip == "0:0:0:0:0:0:0:1") {
            return true
        }
        if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("fe80:") || ip.endsWith(".local")) {
            return true
        }
        val parts = ip.split(".")
        if (parts.size == 4 && parts[0] == "172") {
            val second = parts[1].toIntOrNull() ?: return false
            if (second in 16..31) {
                return true
            }
        }
        return false
    }

    private fun parseResponse(body: String): GisEstimateModel {
        val node: JsonNode = objectMapper.readTree(body)
        if (node.path("status").asText() != "success") {
            val message = node.path("message").asText("unknown")
            log.warn("GeoIP lookup rejected: {}", message)
            throw ApiException("Не удалось определить местоположение по IP")
        }
        return GisEstimateModel(
            lat = node.path("lat").asDouble(),
            lon = node.path("lon").asDouble(),
            approximate = true
        )
    }
}
