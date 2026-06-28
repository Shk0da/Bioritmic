package com.github.shk0da.bioritmic.api.constants

import com.github.shk0da.bioritmic.api.model.gis.GeoCountryModel

object GeoCountries {
    val ALL: List<GeoCountryModel> = listOf(
        GeoCountryModel("RU", "Россия"),
        GeoCountryModel("BY", "Беларусь"),
        GeoCountryModel("KZ", "Казахстан"),
        GeoCountryModel("UA", "Украина"),
        GeoCountryModel("AM", "Армения"),
        GeoCountryModel("AZ", "Азербайджан"),
        GeoCountryModel("GE", "Грузия"),
        GeoCountryModel("KG", "Киргизия"),
        GeoCountryModel("MD", "Молдова"),
        GeoCountryModel("TJ", "Таджикистан"),
        GeoCountryModel("TM", "Туркменистан"),
        GeoCountryModel("UZ", "Узбекистан"),
        GeoCountryModel("LV", "Латвия"),
        GeoCountryModel("LT", "Литва"),
        GeoCountryModel("EE", "Эстония"),
        GeoCountryModel("DE", "Германия"),
        GeoCountryModel("US", "США"),
        GeoCountryModel("GB", "Великобритания"),
        GeoCountryModel("FR", "Франция"),
        GeoCountryModel("IT", "Италия"),
        GeoCountryModel("ES", "Испания"),
        GeoCountryModel("PL", "Польша"),
        GeoCountryModel("CZ", "Чехия"),
        GeoCountryModel("TR", "Турция"),
        GeoCountryModel("IL", "Израиль"),
        GeoCountryModel("AE", "ОАЭ"),
        GeoCountryModel("CN", "Китай"),
        GeoCountryModel("IN", "Индия"),
        GeoCountryModel("JP", "Япония"),
        GeoCountryModel("KR", "Южная Корея"),
        GeoCountryModel("CA", "Канада"),
        GeoCountryModel("AU", "Австралия")
    )

    fun findByCode(code: String): GeoCountryModel? =
        ALL.firstOrNull { it.code.equals(code.trim(), ignoreCase = true) }
}
