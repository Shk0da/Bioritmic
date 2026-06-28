package com.github.shk0da.bioritmic.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.github.shk0da.bioritmic.api.service.GeoIpService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class GeoIpServiceTest {

    private val service = GeoIpService(ObjectMapper())

    @Test
    fun buildLookupUrlUsesOutboundIpForLocalhost() {
        assertEquals(
            "http://ip-api.com/json?fields=status,message,lat,lon",
            service.buildLookupUrl("127.0.0.1")
        )
    }

    @Test
    fun buildLookupUrlUsesClientIpForPublicAddress() {
        assertEquals(
            "http://ip-api.com/json/8.8.8.8?fields=status,message,lat,lon",
            service.buildLookupUrl("8.8.8.8")
        )
    }

    @Test
    fun isLocalOrPrivateIpDetectsPrivateRanges() {
        assertTrue(service.isLocalOrPrivateIp("127.0.0.1"))
        assertTrue(service.isLocalOrPrivateIp("192.168.1.10"))
        assertTrue(service.isLocalOrPrivateIp("10.0.0.5"))
        assertTrue(service.isLocalOrPrivateIp("172.16.0.1"))
        assertFalse(service.isLocalOrPrivateIp("8.8.8.8"))
    }
}
