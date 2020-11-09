package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.model.BiorhythmModel
import org.springframework.stereotype.Service
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.collections.HashMap
import kotlin.math.abs
import kotlin.math.floor

@Service
class BiorhythmService {

    private val biorhythms: Map<String, BiorhythmModel> = with(HashMap<String, BiorhythmModel>()) {
        /*
           Физический — 23,6884 суток — соответствует нижней чакре Муладхара
           Эмоциональный — 28,426125 суток — вторая чакра Свадхистана
           Интеллектуальный — 33,163812 суток — третья чакра Манипура
           Сердечный — 37,901499 суток — четвертая чакра Анахата
           Творческий — 42,6392 суток — пятая чакра Вишудха
           Интуитивный — 47,3769 суток — шестая чакра Аджна
           Высшая чакра — 52,1146 суток — седьмая чакра Сахасрара
        */
        put("fiz", BiorhythmModel("Физическая", 23.6884))
        put("emo", BiorhythmModel("Эмоциональная", 28.426125))
        put("int", BiorhythmModel("Интелектуальная", 33.163812))
        put("hrt", BiorhythmModel("Сердечный", 37.901499))
        put("crt", BiorhythmModel("Творческий", 42.6392))
        put("inv", BiorhythmModel("Интуитивный", 47.3769))
        put("upp", BiorhythmModel("Высшая чакра", 52.1146))
        this
    }

    private val horo: Map<String, IntArray> = with(HashMap<String, IntArray>()) {
        /*
          Огонь — Овен, Лев, Стрелец
          Воздух — Близнецы, Весы, Водолей
          Земля — Телец, Дева, Козерог
          Вода — Рак, Скорпион, Рыба
       */
        // 'Козерог', 'Водолей', 'Рыбы', 'Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Девы', 'Весы', 'Скорпион', 'Стрелец'
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
        put(1, 21)
        put(2, 20)
        put(3, 20)
        put(4, 20)
        put(5, 20)
        put(6, 20)
        put(7, 21)
        put(8, 22)
        put(9, 23)
        put(10, 23)
        put(11, 23)
        put(12, 23)
        put(13, 21)
        this
    }

    private val horoRegister: HashMap<String, Boolean> = HashMap()

    fun getNumZodiac(birthDate: Date): Int {
        val calendar = with(Calendar.getInstance(TimeZone.getDefault())) {
            time = birthDate
            this
        }
        val month = calendar[Calendar.MONTH]
        val day = calendar[Calendar.DAY_OF_MONTH]
        return if (day < zodiak[month + 1]!!) month - 1 else month % 12
    }

    fun horoCompare(zodiac1: Int, zodiac2: Int): Boolean {
        val horoKey = "horo_{$zodiac1}_{$zodiac2}"
        if (horoRegister.containsKey(horoKey)) {
            return horoRegister.getOrDefault(horoKey, false)
        }

        var isCompare = false
        horo.forEach {
            val zodiacs = it.value
            if (zodiac1 != zodiac2 && zodiacs.contains(zodiac1) && zodiacs.contains(zodiac2)) {
                isCompare = true
            }
            if (horo["earth"]!!.contains(zodiac1) && horo["water"]!!.contains(zodiac2)) {
                isCompare = true
            }
            if (horo["earth"]!!.contains(zodiac2) && horo["water"]!!.contains(zodiac1)) {
                isCompare = true
            }
            if (horo["fire"]!!.contains(zodiac1) && horo["air"]!!.contains(zodiac2)) {
                isCompare = true
            }
            if (horo["fire"]!!.contains(zodiac2) && horo["air"]!!.contains(zodiac2)) {
                isCompare = true
            }
        }
        horoRegister[horoKey] = isCompare
        return isCompare
    }

    fun compare(birthDate1: Date, birthDate2: Date): HashMap<String, Double> {
        val compare = HashMap<String, Double>()
        val diffInMillis: Long = abs(birthDate1.time - birthDate2.time)
        val livedDaysDiff = TimeUnit.DAYS.convert(diffInMillis, TimeUnit.MILLISECONDS)
        biorhythms.forEach {
            val relation = livedDaysDiff / it.value.cycle
            val rhythm = floor((relation - floor(relation)) * 100)
            compare[it.value.name] = if (rhythm > 50) ((rhythm - 50) * 2) else (-1) * ((rhythm - 50) * 2)
        }
        return compare
    }

    fun horoCompare(birthDate1: Date, birthDate2: Date): Boolean {
        return horoCompare(getNumZodiac(birthDate1), getNumZodiac(birthDate2))
    }

    fun boolCompare(birthDate1: Date, birthDate2: Date): Boolean {
        val compare = compare(birthDate1, birthDate2).values
        val average = compare.sum() / compare.size
        return average >= 60
    }

    fun fullCompare(birthDate1: Date, birthDate2: Date): Boolean {
        return horoCompare(birthDate1, birthDate2) && boolCompare(birthDate1, birthDate2)
    }
}
