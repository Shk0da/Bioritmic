package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.controller.Router.routing
import io.ktor.application.Application
import io.ktor.application.install
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.features.BrowserUserAgent
import io.ktor.client.features.HttpTimeout
import io.ktor.client.features.json.GsonSerializer
import io.ktor.client.features.json.JsonFeature
import io.ktor.client.features.logging.LogLevel
import io.ktor.client.features.logging.Logging
import io.ktor.features.*
import io.ktor.gson.gson
import io.ktor.http.CacheControl
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.cio.websocket.pingPeriod
import io.ktor.http.cio.websocket.timeout
import io.ktor.http.content.CachingOptions
import io.ktor.locations.Locations
import io.ktor.util.date.GMTDate
import io.ktor.websocket.WebSockets
import kotlinx.coroutines.runBlocking
import java.text.DateFormat
import java.time.Duration

@Suppress("unused")
class ApplicationConfiguration {

    @JvmOverloads
    fun Application.module(testing: Boolean = false) {
        val client = HttpClient(CIO) {
            install(HttpTimeout) {
            }
            install(JsonFeature) {
                serializer = GsonSerializer()
            }
            install(Logging) {
                level = LogLevel.HEADERS
            }
            BrowserUserAgent() // install default browser-like user-agent
            // install(UserAgent) { agent = "some user agent" }
        }
        runBlocking {
            // Sample for making a HTTP Client request
            /*
            val message = client.post<JsonSampleClass> {
                url("http://127.0.0.1:8080/path/to/endpoint")
                contentType(ContentType.Application.Json)
                body = JsonSampleClass(hello = "world")
            }
            */
        }

        install(WebSockets) {
            pingPeriod = Duration.ofSeconds(15)
            timeout = Duration.ofSeconds(15)
            maxFrameSize = Long.MAX_VALUE
            masking = false
        }

        install(Locations) {
        }

        install(ConditionalHeaders)

        install(CORS) {
            method(HttpMethod.Options)
            method(HttpMethod.Get)
            method(HttpMethod.Post)
            method(HttpMethod.Put)
            method(HttpMethod.Delete)
            method(HttpMethod.Patch)
            header(HttpHeaders.Authorization)
            allowCredentials = true
            anyHost()
        }

        install(CachingHeaders) {
            options { outgoingContent ->
                when (outgoingContent.contentType?.withoutParameters()) {
                    ContentType.Text.CSS -> CachingOptions(CacheControl.MaxAge(maxAgeSeconds = 24 * 60 * 60), expires = null as? GMTDate?)
                    else -> null
                }
            }
        }

        install(DataConversion)

        install(DefaultHeaders) {
            header("X-Engine", "Ktor") // will send this header with each response
        }

        install(ContentNegotiation) {
            gson {
                setDateFormat(DateFormat.LONG)
                setPrettyPrinting()
            }
        }

        routing()
    }
}