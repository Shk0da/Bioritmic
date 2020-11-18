package com.github.shk0da.bioritmic.api

import com.github.shk0da.bioritmic.api.utils.ImageUtils
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ApiApplication

fun main(args: Array<String>) {
    ImageUtils.initStorages()
    runApplication<ApiApplication>(*args)
}
