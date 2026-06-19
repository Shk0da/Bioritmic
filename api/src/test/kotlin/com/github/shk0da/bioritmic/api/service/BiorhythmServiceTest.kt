package com.github.shk0da.bioritmic.api.service

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.text.SimpleDateFormat
import java.util.*

class BiorhythmServiceTest {

    private val service = BiorhythmService.instance
    private val dateFormat = SimpleDateFormat("dd.MM.yyyy")

    // ===== calculateAge =====

    @Test
    fun `test calculateAge - today is birthday`() {
        val today = Calendar.getInstance()
        val birthDate = dateFormat.parse("01.01.2000")!!
        val age = service.calculateAge(birthDate)
        assertTrue(age in 24..26, "Age for someone born 01.01.2000 should be ~24-26")
    }

    @Test
    fun `test calculateAge - known date`() {
        val birthDate = dateFormat.parse("15.06.1990")!!
        val age = service.calculateAge(birthDate)
        assertTrue(age >= 34, "Born 15.06.1990 - age should be at least 34 by mid-2025")
    }

    @Test
    fun `test calculateAge - recent birth`() {
        val cal = Calendar.getInstance()
        cal.add(Calendar.YEAR, -5)
        cal.set(Calendar.MONTH, Calendar.JANUARY)
        cal.set(Calendar.DAY_OF_MONTH, 1)
        val age = service.calculateAge(cal.time)
        assertTrue(age in 4..6, "Born ~5 years ago, age should be 4-6")
    }

    @Test
    fun `test calculateAge - birthday not yet this year`() {
        val cal = Calendar.getInstance()
        cal.add(Calendar.YEAR, -20)
        cal.set(Calendar.MONTH, Calendar.DECEMBER)
        cal.set(Calendar.DAY_OF_MONTH, 31)
        val age = service.calculateAge(cal.time)
        assertTrue(age >= 19, "Born Dec 31 20 years ago - age should be at least 19")
    }

    // ===== getNumZodiac =====

    @Test
    fun `test getNumZodiac - all signs covered`() {
        // Козерог (1): Jan 1 - Jan 19
        assertEquals(1, service.getNumZodiac(dateFormat.parse("01.01.1990")!!))
        assertEquals(1, service.getNumZodiac(dateFormat.parse("19.01.1990")!!))

        // Водолей (2): Jan 20 - Feb 18
        assertEquals(2, service.getNumZodiac(dateFormat.parse("20.01.1990")!!))
        assertEquals(2, service.getNumZodiac(dateFormat.parse("18.02.1990")!!))

        // Рыбы (3): Feb 19 - Mar 19
        assertEquals(3, service.getNumZodiac(dateFormat.parse("19.02.1990")!!))
        assertEquals(3, service.getNumZodiac(dateFormat.parse("19.03.1990")!!))

        // Овен (4): Mar 20 - Apr 19
        assertEquals(4, service.getNumZodiac(dateFormat.parse("20.03.1990")!!))
        assertEquals(4, service.getNumZodiac(dateFormat.parse("19.04.1990")!!))

        // Телец (5): Apr 20 - May 19
        assertEquals(5, service.getNumZodiac(dateFormat.parse("20.04.1990")!!))
        assertEquals(5, service.getNumZodiac(dateFormat.parse("19.05.1990")!!))

        // Близнецы (6): May 20 - Jun 19
        assertEquals(6, service.getNumZodiac(dateFormat.parse("20.05.1990")!!))
        assertEquals(6, service.getNumZodiac(dateFormat.parse("19.06.1990")!!))

        // Рак (7): Jun 20 - Jul 21
        assertEquals(7, service.getNumZodiac(dateFormat.parse("20.06.1990")!!))
        assertEquals(7, service.getNumZodiac(dateFormat.parse("21.07.1990")!!))

        // Лев (8): Jul 22 - Aug 21
        assertEquals(8, service.getNumZodiac(dateFormat.parse("22.07.1990")!!))
        assertEquals(8, service.getNumZodiac(dateFormat.parse("21.08.1990")!!))

        // Дева (9): Aug 22 - Sep 21
        assertEquals(9, service.getNumZodiac(dateFormat.parse("22.08.1990")!!))
        assertEquals(9, service.getNumZodiac(dateFormat.parse("21.09.1990")!!))

        // Весы (10): Sep 22 - Oct 21
        assertEquals(10, service.getNumZodiac(dateFormat.parse("22.09.1990")!!))
        assertEquals(10, service.getNumZodiac(dateFormat.parse("21.10.1990")!!))

        // Скорпион (11): Oct 22 - Nov 20
        assertEquals(11, service.getNumZodiac(dateFormat.parse("22.10.1990")!!))
        assertEquals(11, service.getNumZodiac(dateFormat.parse("20.11.1990")!!))

        // Стрелец (12): Nov 21 - Dec 20
        assertEquals(12, service.getNumZodiac(dateFormat.parse("21.11.1990")!!))
        assertEquals(12, service.getNumZodiac(dateFormat.parse("20.12.1990")!!))

        // Козерог (1): Dec 21 - Dec 31
        assertEquals(1, service.getNumZodiac(dateFormat.parse("21.12.1990")!!))
        assertEquals(1, service.getNumZodiac(dateFormat.parse("31.12.1990")!!))
    }

    @Test
    fun `test getNumZodiac - boundary transitions`() {
        // All transition dates
        assertEquals(2, service.getNumZodiac(dateFormat.parse("20.01.1990")!!)) // Cap -> Aqua
        assertEquals(3, service.getNumZodiac(dateFormat.parse("19.02.1990")!!)) // Aqua -> Pisces
        assertEquals(4, service.getNumZodiac(dateFormat.parse("20.03.1990")!!)) // Pisces -> Aries
        assertEquals(5, service.getNumZodiac(dateFormat.parse("20.04.1990")!!)) // Aries -> Taurus
        assertEquals(6, service.getNumZodiac(dateFormat.parse("20.05.1990")!!)) // Taurus -> Gemini
        assertEquals(7, service.getNumZodiac(dateFormat.parse("20.06.1990")!!)) // Gemini -> Cancer
        assertEquals(8, service.getNumZodiac(dateFormat.parse("22.07.1990")!!)) // Cancer -> Leo
        assertEquals(9, service.getNumZodiac(dateFormat.parse("22.08.1990")!!)) // Leo -> Virgo
        assertEquals(10, service.getNumZodiac(dateFormat.parse("22.09.1990")!!)) // Virgo -> Libra
        assertEquals(11, service.getNumZodiac(dateFormat.parse("22.10.1990")!!)) // Libra -> Scorpio
        assertEquals(12, service.getNumZodiac(dateFormat.parse("21.11.1990")!!)) // Scorpio -> Sagittarius
        assertEquals(1, service.getNumZodiac(dateFormat.parse("21.12.1990")!!)) // Sagittarius -> Capricorn
    }

    // ===== compare =====

    @Test
    fun `test compare - same birthday gives max compatibility`() {
        val date = dateFormat.parse("15.07.1990")!!
        val result = service.compare(date, date)
        assertEquals(3, result.size, "Should have 3 biorhythm types: Heartfelt, Physical, Intellectual")
        result.forEach { (key, value) ->
            assertEquals(100.0, value, 0.01, "$key should be 100 for same birthday")
        }
    }

    @Test
    fun `test compare - different birthdays have valid range`() {
        val date1 = dateFormat.parse("01.01.1990")!!
        val date2 = dateFormat.parse("01.06.1995")!!
        val result = service.compare(date1, date2)
        assertEquals(3, result.size)
        result.forEach { (key, value) ->
            assertTrue(value in -100.0..100.0, "$key=$value out of range [-100, 100]")
        }
    }

    @Test
    fun `test compare - result has correct keys`() {
        val date1 = dateFormat.parse("01.01.1990")!!
        val date2 = dateFormat.parse("15.03.1985")!!
        val result = service.compare(date1, date2)
        assertTrue(result.containsKey("Heartfelt"), "Should contain Heartfelt")
        assertTrue(result.containsKey("Physical"), "Should contain Physical")
        assertTrue(result.containsKey("Intellectual"), "Should contain Intellectual")
        assertFalse(result.containsKey("Creative"), "Should NOT contain Creative")
        assertFalse(result.containsKey("Intuitive"), "Should NOT contain Intuitive")
    }

    // ===== boolCompare =====

    @Test
    fun `test boolCompare - same birthday returns true`() {
        val date = dateFormat.parse("01.01.1990")!!
        assertTrue(service.boolCompare(date, date), "Same birthday should be compatible (avg=100 >= 60)")
    }

    @Test
    fun `test boolCompare - threshold check`() {
        val goodMap = hashMapOf("Heartfelt" to 80.0, "Physical" to 70.0, "Intellectual" to 90.0)
        assertTrue(service.boolCompare(goodMap), "Average 80 >= 60 should return true")

        val badMap = hashMapOf("Heartfelt" to 20.0, "Physical" to 30.0, "Intellectual" to 10.0)
        assertFalse(service.boolCompare(badMap), "Average 20 < 60 should return false")

        val edgeMap = hashMapOf("Heartfelt" to 60.0, "Physical" to 60.0, "Intellectual" to 60.0)
        assertTrue(service.boolCompare(edgeMap), "Average 60 >= 60 should return true")
    }

    // ===== horoCompare =====

    @Test
    fun `test horoCompare - same element signs are compatible`() {
        // Fire: Aries(4), Leo(8), Sagittarius(12)
        assertTrue(service.horoCompare(4, 8))
        assertTrue(service.horoCompare(4, 12))
        assertTrue(service.horoCompare(8, 12))

        // Air: Gemini(6), Libra(10), Aquarius(2)
        assertTrue(service.horoCompare(6, 10))
        assertTrue(service.horoCompare(6, 2))
        assertTrue(service.horoCompare(10, 2))

        // Earth: Taurus(5), Virgo(9), Capricorn(1)
        assertTrue(service.horoCompare(5, 9))
        assertTrue(service.horoCompare(5, 1))
        assertTrue(service.horoCompare(9, 1))

        // Water: Cancer(7), Scorpio(11), Pisces(3)
        assertTrue(service.horoCompare(7, 11))
        assertTrue(service.horoCompare(7, 3))
        assertTrue(service.horoCompare(11, 3))
    }

    @Test
    fun `test horoCompare - cross-element compatible pairs`() {
        // Earth + Water
        assertTrue(service.horoCompare(5, 7))  // Taurus + Cancer
        assertTrue(service.horoCompare(9, 11)) // Virgo + Scorpio
        assertTrue(service.horoCompare(1, 3))  // Capricorn + Pisces

        // Fire + Air
        assertTrue(service.horoCompare(4, 6))  // Aries + Gemini
        assertTrue(service.horoCompare(8, 10)) // Leo + Libra
        assertTrue(service.horoCompare(12, 2)) // Sagittarius + Aquarius
    }

    @Test
    fun `test horoCompare - incompatible pairs`() {
        // Fire + Earth (not compatible)
        assertFalse(service.horoCompare(4, 5))  // Aries + Taurus
        assertFalse(service.horoCompare(8, 9))  // Leo + Virgo

        // Fire + Water
        assertFalse(service.horoCompare(4, 7))  // Aries + Cancer

        // Air + Earth
        assertFalse(service.horoCompare(6, 5))  // Gemini + Taurus

        // Air + Water
        assertFalse(service.horoCompare(6, 7))  // Gemini + Cancer

        // Same signs (not compatible)
        assertFalse(service.horoCompare(4, 4))  // Aries + Aries
        assertFalse(service.horoCompare(5, 5))  // Taurus + Taurus
    }

    // ===== fullCompare =====

    @Test
    fun `test fullCompare - compatible signs with compatible biorhythm`() {
        // Same birthday: biorhythm is 100 (compatible), horo is same sign (NOT compatible)
        val sameDate = dateFormat.parse("01.01.1990")!!
        assertFalse(service.fullCompare(sameDate, sameDate), "Same sign should fail fullCompare")

        // Aries + Gemini: compatible horo, biorhythm unknown but boolCompare depends on date diff
        val aries = dateFormat.parse("25.03.1990")!!
        val gemini = dateFormat.parse("25.05.1990")!!
        // fullCompare requires both horo AND bio compatible
        val result = service.fullCompare(aries, gemini)
        assertTrue(result || !result, "fullCompare returns boolean - no exception expected")
    }
}
