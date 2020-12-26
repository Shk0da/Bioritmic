package com.github.shk0da.bioritmic.api.controller.errors

import com.fasterxml.jackson.core.JsonParseException
import com.fasterxml.jackson.databind.JsonMappingException
import com.fasterxml.jackson.databind.exc.InvalidFormatException
import com.fasterxml.jackson.databind.exc.MismatchedInputException
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_NAME
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.Constants.PARAMETER_VALUE_LENGTH
import com.github.shk0da.bioritmic.api.model.error.ApiError
import com.github.shk0da.bioritmic.api.model.error.ApiErrors
import com.github.shk0da.bioritmic.api.utils.LoggingUtils.Level.ERROR
import com.github.shk0da.bioritmic.api.utils.LoggingUtils.logWithErrorCode
import org.springframework.beans.TypeMismatchException
import org.springframework.core.codec.DecodingException
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.*
import org.springframework.web.bind.support.WebExchangeBindException
import org.springframework.web.server.ServerWebInputException
import java.io.IOException
import java.sql.SQLException
import java.util.*
import java.util.stream.Collectors
import java.util.stream.Collectors.joining
import javax.validation.ConstraintViolationException
import javax.validation.UnexpectedTypeException
import javax.validation.constraints.Size

@ControllerAdvice
@RestControllerAdvice
class ApiExceptionHandler {

    companion object {
        const val SERVICE_UNAVAILABLE_RETRY_AFTER = "10" // delay-seconds
    }

    @ResponseBody
    @ExceptionHandler(Exception::class)
    @ResponseStatus(value = HttpStatus.INTERNAL_SERVER_ERROR)
    fun handleException(ex: Exception): ResponseEntity<ApiErrors> {
        logError(ex)
        return ResponseEntity(
            ApiErrors(ApiError.of(ErrorCode.API_INTERNAL_ERROR)),
            ErrorCode.API_INTERNAL_ERROR.httpCode
        )
    }

    /**
     * Prepare SQLException and IOException
     *
     * @param ex [Exception]
     * @return [ResponseEntity] with "Retry-After" HTTP Header
     * @see [Retry-After](https://tools.ietf.org/html/rfc7231.section-7.1.3)
     */
    @ResponseBody
    @ExceptionHandler(SQLException::class, IOException::class)
    @ResponseStatus(value = HttpStatus.SERVICE_UNAVAILABLE)
    fun handleSQLException(ex: Exception): ResponseEntity<ApiErrors> {
        logError(ex)
        val headers: MultiValueMap<String, String> = object : LinkedMultiValueMap<String, String>() {
            init {
                add(HttpHeaders.RETRY_AFTER, SERVICE_UNAVAILABLE_RETRY_AFTER)
            }
        }
        return ResponseEntity(
            ApiErrors(ApiError.of(ErrorCode.API_SERVICE_UNAVAILABLE)),
            headers,
            ErrorCode.API_SERVICE_UNAVAILABLE.httpCode
        )
    }

    @ResponseBody
    @ExceptionHandler(
        IllegalArgumentException::class,
        TypeMismatchException::class,
        JsonMappingException::class,
        InvalidFormatException::class,
        UnexpectedTypeException::class,
        IllegalArgumentException::class,
        MethodArgumentNotValidException::class,
        HttpMessageNotReadableException::class,
        MismatchedInputException::class,
        DecodingException::class,
        ServerWebInputException::class,
        ConstraintViolationException::class
    )
    @ResponseStatus(value = HttpStatus.BAD_REQUEST)
    fun handleIllegalArgumentException(ex: Exception): ResponseEntity<ApiErrors> {
        logError(ex)
        var error = ex.message
        val throwable = getRootCause(ex)
        if (throwable is MethodArgumentNotValidException) {
            val errors = throwable.bindingResult.fieldErrors
            val parameterizedError = extractParameterizedError(errors)
            if (parameterizedError.isPresent) return parameterizedError.get()
            val parameters = errors.stream().collect(
                Collectors.toMap({ obj: FieldError -> obj.field }, { obj: FieldError -> obj.defaultMessage })
            )
            val parameter = java.lang.String.join(", ", parameters.keys)
            error = java.lang.String.join("; ", parameters.values)
            return handleApiException(ApiException(parameter, error))
        }

        var parameter: String? = null
        when (throwable) {
            is ConstraintViolationException -> {
                val parameterNames: ArrayList<String> = ArrayList()
                throwable.constraintViolations.forEach { constraint ->
                    var item: String? = null
                    val items = constraint.propertyPath.iterator()
                    while (items.hasNext()) {
                        item = items.next().name
                    }
                    if (null != item) {
                        parameterNames.add(item)
                    }
                }
                if (parameterNames.isNotEmpty()) {
                    parameter = parameterNames.stream().collect(joining(", "))
                }
            }
            is InvalidFormatException -> {
                parameter = throwable.path
                    .stream()
                    .map { it.fieldName }
                    .collect(joining(", "))
            }
            is JsonMappingException -> {
                parameter = throwable.path
                    .stream()
                    .map { it.fieldName }
                    .collect(joining(", "))
            }
            is MismatchedInputException -> {
                parameter = throwable.path
                    .stream()
                    .map { it.fieldName }
                    .collect(joining(", "))
            }
            is WebExchangeBindException -> {
                parameter = throwable.fieldErrors
                    .stream()
                    .map { it.field }
                    .collect(joining(", "))
            }
            is IllegalArgumentException -> {
                parameter = throwable.message as String
            }
            is TypeMismatchException -> {
                parameter = throwable.value as String
            }
            is ServerWebInputException -> {
                parameter = throwable.methodParameter?.parameterName
            }
            is NumberFormatException -> {
                throw RuntimeException(error)
            }
            is JsonParseException -> {
                return handleApiException(ApiException(ErrorCode.JSON_CANT_BE_PARSED))
            }
        }
        return if (null != parameter)
            handleApiException(ApiException(ErrorCode.INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, parameter))))
        else
            handleException(ex)
    }

    @ResponseBody
    @ExceptionHandler(ApiException::class)
    @ResponseStatus(value = HttpStatus.BAD_REQUEST)
    fun handleApiException(ex: ApiException): ResponseEntity<ApiErrors> {
        logError(ex)
        return if (ex.errorCode != null)
        // with ErrorCode
            ResponseEntity(ApiErrors(ApiError.of(ex.errorCode!!, ex.parameters)), ex.httpStatus!!)
        else
        // default
            ResponseEntity(
                ApiErrors(
                    ApiError.of(ErrorCode.INVALID_PARAMETER, mapOf(Pair(PARAMETER_NAME, ex.parameter!!)))
                ), HttpStatus.BAD_REQUEST
            )
    }

    private fun extractParameterizedError(errors: List<FieldError>): Optional<ResponseEntity<ApiErrors>> {
        for (fieldError in errors) {
            val errorCode: Optional<ErrorCode> = ErrorCode.byCode(fieldError.defaultMessage)
            if (errorCode.isPresent) {
                val parameters: MutableMap<String, String?> = HashMap()
                // Parameter name
                parameters[PARAMETER_NAME] = fieldError.field
                // Parameter value length
                if (Size::class.java.simpleName == fieldError.code) {
                    parameters[PARAMETER_VALUE_LENGTH] = fieldError.arguments!![1].toString()
                }
                val err = errorCode.get()
                return Optional.of(ResponseEntity(ApiErrors(ApiError.of(err, parameters)), err.httpCode))
            }
        }
        return Optional.empty()
    }

    fun getRootCauseMessage(th: Throwable?): String? {
        val root = getRootCause(th)
        return (root ?: th)!!.message
    }

    fun getRootCause(th: Throwable?): Throwable? {
        val list: List<Throwable> = getThrowableList(th)
        return if (list.isEmpty()) null else list[list.size - 1]
    }

    fun getThrowableList(th: Throwable?): List<Throwable> {
        var throwable = th
        val list: MutableList<Throwable> = ArrayList()
        while (throwable != null && !list.contains(throwable)) {
            list.add(throwable)
            throwable = throwable.cause
        }
        return list
    }

    private fun logError(ex: java.lang.Exception) {
        when (ex) {
            is ApiException -> {
                val errorCode = ex.errorCode?.code ?: "API-000"
                var message: String = ex.message ?: ""
                for ((key, value) in ex.parameters) {
                    message = message.replace("\${$key}", value)
                }
                logWithErrorCode(ERROR, errorCode, "{}", message)
            }
            is IOException -> {
                logWithErrorCode(ERROR, "IOException", "{}", getRootCauseMessage(ex), ex)
            }
            else -> {
                logWithErrorCode(ERROR, "Exception", "{}", getRootCauseMessage(ex), ex)
            }
        }
    }
}
