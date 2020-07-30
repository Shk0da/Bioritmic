package com.github.shk0da.bioritmic.api.controller.errors

import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.ERROR_PATH
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.error.ApiError.Companion.of
import com.github.shk0da.bioritmic.api.model.error.ApiErrors
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.bind.annotation.RestController

@RestController
class CommonErrorController {

    @ResponseBody
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
    fun handleResourceNotFoundException(): ResponseEntity<ApiErrors> {
        return ResponseEntity(ApiErrors(of(ErrorCode.INVALID_URI)), ErrorCode.INVALID_URI.httpCode)
    }
}
