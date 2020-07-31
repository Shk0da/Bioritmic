package com.github.shk0da.bioritmic.api.controller.errors

import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.ERROR_PATH
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.error.ApiError.Companion.of
import com.github.shk0da.bioritmic.api.model.error.ApiErrors
import org.springframework.boot.web.servlet.error.ErrorController
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.bind.annotation.ResponseStatus
import reactor.core.publisher.Mono
import reactor.core.publisher.Mono.just

@Controller
class ApiErrorController : ErrorController {

    @ResponseBody
    @ResponseStatus(HttpStatus.NOT_FOUND)
    @RequestMapping(value = [ERROR_PATH], method = [
        RequestMethod.GET,
        RequestMethod.HEAD,
        RequestMethod.POST,
        RequestMethod.PUT,
        RequestMethod.PATCH,
        RequestMethod.DELETE,
        RequestMethod.OPTIONS,
        RequestMethod.TRACE
    ], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun handleResourceNotFoundException(): Mono<ResponseEntity<ApiErrors>> {
        return just(ResponseEntity(ApiErrors(of(ErrorCode.INVALID_URI)), ErrorCode.INVALID_URI.httpCode))
    }

    override fun getErrorPath(): String {
        return ERROR_PATH
    }
}