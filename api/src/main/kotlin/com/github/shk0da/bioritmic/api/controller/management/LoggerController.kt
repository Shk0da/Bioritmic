package com.github.shk0da.bioritmic.api.controller.management

import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.LoggerContext
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.util.stream.Collectors

@RestController
@RequestMapping("/management")
class LoggerController {

    data class LoggerVM(var name: String? = null, var level: String? = null) : BasicPresentation

    @GetMapping("/logs")
    fun logs(): List<LoggerVM> {
        val context = LoggerFactory.getILoggerFactory() as LoggerContext
        return context.loggerList
                .stream()
                .map { logger: Logger -> LoggerVM(logger.name, logger.effectiveLevel.toString()) }
                .collect(Collectors.toList())
    }

    @PutMapping("/logs")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun changeLevel(@RequestBody jsonLogger: LoggerVM) {
        val context = LoggerFactory.getILoggerFactory() as LoggerContext
        context.getLogger(jsonLogger.name).level = Level.valueOf(jsonLogger.level)
    }
}
