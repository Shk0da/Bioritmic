package com.github.shk0da.bioritmic.service

import com.github.shk0da.bioritmic.api.service.BiorhythmService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.text.SimpleDateFormat
import java.util.*

class BiorhythmServiceTest {

    private val service = BiorhythmService.instance
    private val dateFormat = SimpleDateFormat("dd.MM.yyyy")

    // ===== Тесты для getNumZodiac =====

    @Test
    fun `test Козерог - январь`() {
        val date = dateFormat.parse("15.01.1990")
        assertEquals(1, service.getNumZodiac(date!!), "15 января - Козерог (1)")
    }

    @Test
    fun `test Козерог - декабрь`() {
        val date = dateFormat.parse("25.12.1990")
        assertEquals(1, service.getNumZodiac(date!!), "25 декабря - Козерог (1)")
    }

    @Test
    fun `test Водолей - январь`() {
        val date = dateFormat.parse("25.01.1990")
        assertEquals(2, service.getNumZodiac(date!!), "25 января - Водолей (2)")
    }

    @Test
    fun `test Водолей - февраль`() {
        val date = dateFormat.parse("14.02.1990")
        assertEquals(2, service.getNumZodiac(date!!), "14 февраля - Водолей (2)")
    }

    @Test
    fun `test Рыбы - февраль`() {
        val date = dateFormat.parse("20.02.1990")
        assertEquals(3, service.getNumZodiac(date!!), "20 февраля - Рыбы (3)")
    }

    @Test
    fun `test Рыбы - март`() {
        val date = dateFormat.parse("15.03.1990")
        assertEquals(3, service.getNumZodiac(date!!), "15 марта - Рыбы (3)")
    }

    @Test
    fun `test Овен - март`() {
        val date = dateFormat.parse("25.03.1990")
        assertEquals(4, service.getNumZodiac(date!!), "25 марта - Овен (4)")
    }

    @Test
    fun `test Овен - апрель`() {
        val date = dateFormat.parse("15.04.1990")
        assertEquals(4, service.getNumZodiac(date!!), "15 апреля - Овен (4)")
    }

    @Test
    fun `test Телец - апрель`() {
        val date = dateFormat.parse("25.04.1990")
        assertEquals(5, service.getNumZodiac(date!!), "25 апреля - Телец (5)")
    }

    @Test
    fun `test Телец - май`() {
        val date = dateFormat.parse("15.05.1990")
        assertEquals(5, service.getNumZodiac(date!!), "15 мая - Телец (5)")
    }

    @Test
    fun `test Близнецы - май`() {
        val date = dateFormat.parse("25.05.1990")
        assertEquals(6, service.getNumZodiac(date!!), "25 мая - Близнецы (6)")
    }

    @Test
    fun `test Близнецы - июнь`() {
        val date = dateFormat.parse("15.06.1990")
        assertEquals(6, service.getNumZodiac(date!!), "15 июня - Близнецы (6)")
    }

    @Test
    fun `test Рак - июнь`() {
        val date = dateFormat.parse("25.06.1990")
        assertEquals(7, service.getNumZodiac(date!!), "25 июня - Рак (7)")
    }

    @Test
    fun `test Рак - июль`() {
        val date = dateFormat.parse("15.07.1990")
        assertEquals(7, service.getNumZodiac(date!!), "15 июля - Рак (7)")
    }

    @Test
    fun `test Лев - июль`() {
        val date = dateFormat.parse("25.07.1990")
        assertEquals(8, service.getNumZodiac(date!!), "25 июля - Лев (8)")
    }

    @Test
    fun `test Лев - август`() {
        val date = dateFormat.parse("15.08.1990")
        assertEquals(8, service.getNumZodiac(date!!), "15 августа - Лев (8)")
    }

    @Test
    fun `test Дева - август`() {
        val date = dateFormat.parse("25.08.1990")
        assertEquals(9, service.getNumZodiac(date!!), "25 августа - Дева (9)")
    }

    @Test
    fun `test Дева - сентябрь`() {
        val date = dateFormat.parse("15.09.1990")
        assertEquals(9, service.getNumZodiac(date!!), "15 сентября - Дева (9)")
    }

    @Test
    fun `test Весы - сентябрь`() {
        val date = dateFormat.parse("25.09.1990")
        assertEquals(10, service.getNumZodiac(date!!), "25 сентября - Весы (10)")
    }

    @Test
    fun `test Весы - октябрь`() {
        val date = dateFormat.parse("15.10.1990")
        assertEquals(10, service.getNumZodiac(date!!), "15 октября - Весы (10)")
    }

    @Test
    fun `test Скорпион - октябрь`() {
        val date = dateFormat.parse("25.10.1990")
        assertEquals(11, service.getNumZodiac(date!!), "25 октября - Скорпион (11)")
    }

    @Test
    fun `test Скорпион - ноябрь`() {
        val date = dateFormat.parse("15.11.1990")
        assertEquals(11, service.getNumZodiac(date!!), "15 ноября - Скорпион (11)")
    }

    @Test
    fun `test Стрелец - ноябрь`() {
        val date = dateFormat.parse("25.11.1990")
        assertEquals(12, service.getNumZodiac(date!!), "25 ноября - Стрелец (12)")
    }

    @Test
    fun `test Стрелец - декабрь`() {
        val date = dateFormat.parse("15.12.1990")
        assertEquals(12, service.getNumZodiac(date!!), "15 декабря - Стрелец (12)")
    }

    @Test
    fun `test граничные даты - переход Козерог Водолей`() {
        val before = dateFormat.parse("19.01.1990")
        val after = dateFormat.parse("20.01.1990")
        assertEquals(1, service.getNumZodiac(before!!), "19 января - ещё Козерог")
        assertEquals(2, service.getNumZodiac(after!!), "20 января - уже Водолей")
    }

    @Test
    fun `test граничные даты - переход Водолей Рыбы`() {
        val before = dateFormat.parse("18.02.1990")
        val after = dateFormat.parse("19.02.1990")
        assertEquals(2, service.getNumZodiac(before!!), "18 февраля - ещё Водолей")
        assertEquals(3, service.getNumZodiac(after!!), "19 февраля - уже Рыбы")
    }

    @Test
    fun `test граничные даты - переход Стрелец Козерог`() {
        val before = dateFormat.parse("20.12.1990")
        val after = dateFormat.parse("21.12.1990")
        assertEquals(12, service.getNumZodiac(before!!), "20 декабря - ещё Стрелец")
        assertEquals(1, service.getNumZodiac(after!!), "21 декабря - уже Козерог")
    }

    // ===== Тесты для horoCompare =====

    @Test
    fun `test совместимость Огонь Огон`() {
        // Овен (4) и Лев (8) - оба Огонь
        assertTrue(service.horoCompare(4, 8), "Овен и Лев - совместимы (Огонь)")
    }

    @Test
    fun `test совместимость Земля Земля`() {
        // Телец (5) и Дева (9) - оба Земля
        assertTrue(service.horoCompare(5, 9), "Телец и Дева - совместимы (Земля)")
    }

    @Test
    fun `test совместимость Воздух Воздух`() {
        // Близнецы (6) и Весы (10) - оба Воздух
        assertTrue(service.horoCompare(6, 10), "Близнецы и Весы - совместимы (Воздух)")
    }

    @Test
    fun `test совместимость Вода Вода`() {
        // Рак (7) и Скорпион (11) - оба Вода
        assertTrue(service.horoCompare(7, 11), "Рак и Скорпион - совместимы (Вода)")
    }

    @Test
    fun `test совместимость Земля Вода`() {
        // Телец (5, Земля) и Рак (7, Вода)
        assertTrue(service.horoCompare(5, 7), "Телец и Рак - совместимы (Земля+Вода)")
    }

    @Test
    fun `test совместимость Вода Земля`() {
        // Рак (7, Вода) и Телец (5, Земля)
        assertTrue(service.horoCompare(7, 5), "Рак и Телец - совместимы (Вода+Земля)")
    }

    @Test
    fun `test совместимость Огонь Воздух`() {
        // Овен (4, Огонь) и Близнецы (6, Воздух)
        assertTrue(service.horoCompare(4, 6), "Овен и Близнецы - совместимы (Огонь+Воздух)")
    }

    @Test
    fun `test совместимость Воздух Огонь`() {
        // Близнецы (6, Воздух) и Овен (4, Огонь)
        assertTrue(service.horoCompare(6, 4), "Близнецы и Овен - совместимы (Воздух+Огонь)")
    }

    @Test
    fun `test несовместимость Огонь Земля`() {
        // Овен (4, Огонь) и Телец (5, Земля)
        assertFalse(service.horoCompare(4, 5), "Овен и Телец - не совместимы")
    }

    @Test
    fun `test несовместимость Вода Воздух`() {
        // Рак (7, Вода) и Близнецы (6, Воздух)
        assertFalse(service.horoCompare(7, 6), "Рак и Близнецы - не совместимы")
    }

    @Test
    fun `test несовместимость одинаковые знаки`() {
        // Одинаковые знаки не совместимы по правилам
        assertFalse(service.horoCompare(4, 4), "Овен и Овен - не совместимы (одинаковые)")
        assertFalse(service.horoCompare(7, 7), "Рак и Рак - не совместимы (одинаковые)")
    }

    // ===== Тесты для compare =====

    @Test
    fun `test compare одинаковые даты`() {
        val date = dateFormat.parse("01.01.1990")
        val result = service.compare(date, date)
        
        // При одинаковых датах разница 0 дней, все значения должны быть 100 (максимальная совместимость)
        result.values.forEach { value ->
            assertEquals(100.0, value, 0.01, "При одинаковых датах совместимость должна быть 100")
        }
    }

    @Test
    fun `test compare разные даты`() {
        val date1 = dateFormat.parse("01.01.1990")
        val date2 = dateFormat.parse("01.02.1990")
        val result = service.compare(date1!!, date2!!)
        
        // Проверяем, что результаты в диапазоне [0, 100]
        result.values.forEach { value ->
            assertTrue(value in 0.0..100.0, "Значение совместимости должно быть в диапазоне [0, 100]")
        }
    }

    // ===== Тесты для boolCompare =====

    @Test
    fun `test boolCompare одинаковые даты`() {
        val date = dateFormat.parse("01.01.1990")
        assertTrue(service.boolCompare(date, date), "При одинаковых датах средняя совместимость 100 >= 60")
    }

    // ===== Тесты для fullCompare =====

    @Test
    fun `test fullCombine совместимые знаки`() {
        // Овен (4) и Близнецы (6) - Огонь + Воздух
        val date1 = dateFormat.parse("01.04.1990") // Овен
        val date2 = dateFormat.parse("01.06.1990") // Близнецы
        // Проверяем только гороскопическую совместимость
        assertTrue(service.horoCompare(date1!!, date2!!), "Овен и Близнецы - совместимы по гороскопу")
    }
}
