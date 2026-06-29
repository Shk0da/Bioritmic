package com.github.shk0da.bioritmic.api.service

import java.util.Calendar
import java.util.Date
import java.util.LinkedHashMap
import java.util.TimeZone
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.sin

class BiorhythmService {

    companion object {
        val instance: BiorhythmService = BiorhythmService()

        private const val ZODIAC_MONTHS = 12
        private const val BIORHYTHM_PERCENTAGE = 100.0
        private const val COMPATIBILITY_THRESHOLD = 60.0
        private const val SPIRITUAL_PERIOD = 53.0

        /** Краткая совместимость: сердечная, физическая, интеллект. */
        val SUMMARY_CYCLE_NAMES: List<String> = listOf("Heartfelt", "Physical", "Intellectual")

        /** Детальная совместимость: все чакры снизу вверх + духовный цикл. */
        val DETAIL_CYCLE_NAMES: List<String> = listOf(
            "Physical",
            "Emotional",
            "Intellectual",
            "Heartfelt",
            "Creative",
            "Intuitive",
            "HighestChakra",
            "Spiritual",
        )
    }

    private val biorhythms: Map<String, Double> = linkedMapOf(
        "Physical" to 23.6884,
        "Emotional" to 28.426125,
        "Intellectual" to 33.163812,
        "Heartfelt" to 37.901499,
        "Creative" to 42.6392,
        "Intuitive" to 47.3769,
        "HighestChakra" to 52.1146,
    )

    private fun periodForCycle(name: String): Double = when (name) {
        "Spiritual" -> SPIRITUAL_PERIOD
        else -> biorhythms[name]
            ?: throw IllegalArgumentException("Unknown biorhythm cycle: $name")
    }

    private val horo: Map<String, IntArray> = with(HashMap<String, IntArray>()) {
        /*
          Огонь — Овен, Лев, Стрелец
          Воздух — Близнецы, Весы, Водолей
          Земля — Телец, Дева, Козерог
          Вода — Рак, Скорпион, Рыба
       */
        // 'Козерог', 'Водолей', 'Рыбы', 'Овен', 'Телец', 'Близнецы',
        // 'Рак', 'Лев', 'Девы', 'Весы', 'Скорпион', 'Стрелец'
        /*
          3 правила совместимости знаков Зодиака:
            знаки не одинаковы и знаки принадлежат одной стихии
             или
            знак Земли — со знаком Воды / знак Воздуха — со знаком Огня
        */
        put("fire", intArrayOf(4, 8, 12))
        put("air", intArrayOf(6, 10, 2))
        put("earth", intArrayOf(5, 9, 1))
        put("water", intArrayOf(7, 11, 3))
        this
    }

    private val zodiak: Map<Int, Int> = with(HashMap<Int, Int>()) {
        // День перехода к следующему знаку для каждого месяца (1=Янв, 12=Дек)
        // 20 янв - Козерог→Водолей, 19 фев - Водолей→Рыбы, и т.д.
        put(1, 20)  // 20 января - переход от Козерога к Водолею
        put(2, 19)  // 19 февраля - переход от Водолея к Рыбам
        put(3, 20)  // 20 марта - переход от Рыб к Овну
        put(4, 20)  // 20 апреля - переход от Овна к Тельцу
        put(5, 20)  // 20 мая - переход от Тельца к Близнецам
        put(6, 20)  // 20 июня - переход от Близнецов к Раку
        put(7, 22)  // 22 июля - переход от Рака ко Льву
        put(8, 22)  // 22 августа - переход от Льва к Деве
        put(9, 22)  // 22 сентября - переход от Девы к Весам
        put(10, 22) // 22 октября - переход от Весов к Скорпиону
        put(11, 21) // 21 ноября - переход от Скорпиона к Стрельцу
        put(12, 21) // 21 декабря - переход от Стрельца к Козерогу
        this
    }

    private val horoRegister: HashMap<String, Boolean> = HashMap()

    /**
     * Возвращает порядковый номер знака зодиака (1-12)
     * 1=Козерог, 2=Водолей, 3=Рыбы, 4=Овен, 5=Телец, 6=Близнецы,
     * 7=Рак, 8=Лев, 9=Дева, 10=Весы, 11=Скорпион, 12=Стрелец
     */
    fun getNumZodiac(birthDate: Date): Int {
        val calendar = with(Calendar.getInstance(TimeZone.getDefault())) {
            time = birthDate
            this
        }
        val month = calendar[Calendar.MONTH] + 1 // 1-12
        val day = calendar[Calendar.DAY_OF_MONTH]

        // zodiak[month] = день перехода к СЛЕДУЮЩЕМУ знаку
        // Если день >= дня перехода, то это следующий знак
        // Если день < дня перехода, то это текущий знак месяца
        
        return if (day >= zodiak[month]!!) {
            // День перехода или после - следующий знак
            if (month == ZODIAC_MONTHS) 1 else month + 1
        } else {
            // До дня перехода - текущий знак месяца
            month
        }
    }

    fun horoCompare(zodiac1: Int, zodiac2: Int): Boolean {
        val horoKey = "horo_${zodiac1}_${zodiac2}"
        if (horoRegister.containsKey(horoKey)) {
            return horoRegister.getOrDefault(horoKey, false)
        }

        var isCompare = false
        
        // Правило 1: знаки одинаковой стихии (но не одинаковые)
        horo.forEach { (_, zodiacs) ->
            if (zodiac1 != zodiac2 && zodiacs.contains(zodiac1) && zodiacs.contains(zodiac2)) {
                isCompare = true
            }
        }
        
        // Правило 2: Земля + Вода
        if (horo["earth"]!!.contains(zodiac1) && horo["water"]!!.contains(zodiac2)) {
            isCompare = true
        }
        if (horo["earth"]!!.contains(zodiac2) && horo["water"]!!.contains(zodiac1)) {
            isCompare = true
        }
        
        // Правило 3: Огонь + Воздух
        if (horo["fire"]!!.contains(zodiac1) && horo["air"]!!.contains(zodiac2)) {
            isCompare = true
        }
        if (horo["fire"]!!.contains(zodiac2) && horo["air"]!!.contains(zodiac1)) {
            isCompare = true
        }
        
        horoRegister[horoKey] = isCompare
        return isCompare
    }

    fun compare(birthDate1: Date, birthDate2: Date): LinkedHashMap<String, Double> {
        val compare = LinkedHashMap<String, Double>()
        SUMMARY_CYCLE_NAMES.forEach { name ->
            compare[name] = calculateCycleCompatibilityPercent(
                birthDate1,
                birthDate2,
                periodForCycle(name)
            )
        }
        return compare
    }

    fun horoCompare(birthDate1: Date, birthDate2: Date): Boolean {
        return horoCompare(getNumZodiac(birthDate1), getNumZodiac(birthDate2))
    }

    fun boolCompare(birthDate1: Date, birthDate2: Date): Boolean {
        val compare = compare(birthDate1, birthDate2).values
        val average = compare.sum() / compare.size
        return average >= COMPATIBILITY_THRESHOLD
    }

    fun boolCompare(compare: HashMap<String, Double>): Boolean {
        val values = compare.values
        val average = values.sum() / values.size
        return average >= COMPATIBILITY_THRESHOLD
    }

    fun fullCompare(birthDate1: Date, birthDate2: Date): Boolean {
        return horoCompare(birthDate1, birthDate2) && boolCompare(birthDate1, birthDate2)
    }

    fun calculateAge(birthDate: Date): Int {
        return with(Calendar.getInstance(TimeZone.getDefault())) {
            time = birthDate

            val today = Calendar.getInstance()
            var age = today[Calendar.YEAR] - this[Calendar.YEAR]
            if (today[Calendar.DAY_OF_YEAR] < this[Calendar.DAY_OF_YEAR]) age--
            age
        }
    }

    fun calculateBiorhythmValue(birthDate: Date, period: Double): Double {
        val now = System.currentTimeMillis()
        val birthTime = birthDate.time
        val daysSinceBirth = TimeUnit.DAYS.convert(now - birthTime, TimeUnit.MILLISECONDS)
        val dayInCycle = daysSinceBirth % period
        return sin(2.0 * Math.PI * dayInCycle / period)
    }

    fun detailCompare(birthDate1: Date, birthDate2: Date): BiorhythmDetail {
        val cycles = DETAIL_CYCLE_NAMES.map { name -> BiorhythmCycle(name, periodForCycle(name)) }

        var totalCompatibility = 0.0
        val cycleResults = cycles.map { cycle ->
            val selfValue = calculateBiorhythmValue(birthDate1, cycle.period)
            val otherValue = calculateBiorhythmValue(birthDate2, cycle.period)
            val compatibility = calculateCycleCompatibilityRatio(selfValue, otherValue)
            totalCompatibility += compatibility
            BiorhythmCycleResult(
                name = cycle.name,
                period = cycle.period,
                selfValue = selfValue,
                otherValue = otherValue,
                compatibility = compatibility
            )
        }

        return BiorhythmDetail(
            cycles = cycleResults,
            overallCompatibility = totalCompatibility / cycles.size
        )
    }

    private fun calculateCycleCompatibilityRatio(selfValue: Double, otherValue: Double): Double {
        return 1.0 - abs(selfValue - otherValue) / 2.0
    }

    private fun calculateCycleCompatibilityRatio(birthDate1: Date, birthDate2: Date, period: Double): Double {
        val selfValue = calculateBiorhythmValue(birthDate1, period)
        val otherValue = calculateBiorhythmValue(birthDate2, period)
        return calculateCycleCompatibilityRatio(selfValue, otherValue)
    }

    private fun calculateCycleCompatibilityPercent(birthDate1: Date, birthDate2: Date, period: Double): Double {
        return calculateCycleCompatibilityRatio(birthDate1, birthDate2, period) * BIORHYTHM_PERCENTAGE
    }
}

data class BiorhythmCycle(val name: String, val period: Double)

data class BiorhythmCycleResult(
    val name: String,
    val period: Double,
    val selfValue: Double,
    val otherValue: Double,
    val compatibility: Double
)

data class BiorhythmDetail(
    val cycles: List<BiorhythmCycleResult>,
    val overallCompatibility: Double
)
