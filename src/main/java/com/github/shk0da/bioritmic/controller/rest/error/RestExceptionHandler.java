package com.github.shk0da.bioritmic.controller.rest.error;

import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.github.shk0da.bioritmic.domain.error.BadRequestError;
import com.github.shk0da.bioritmic.domain.error.Error;
import com.github.shk0da.bioritmic.domain.error.InternalServerError;
import com.github.shk0da.bioritmic.exception.BioritmicException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import javax.validation.UnexpectedTypeException;
import java.util.Map;
import java.util.stream.Collectors;

import static java.util.Optional.ofNullable;
import static org.apache.commons.lang3.exception.ExceptionUtils.getRootCause;
import static org.apache.commons.lang3.exception.ExceptionUtils.getRootCauseMessage;

@Slf4j
@RestControllerAdvice(basePackages = {"com.github.shk0da.bioritmic.controller.rest"})
public class RestExceptionHandler {

    @ResponseBody
    @ExceptionHandler({Exception.class})
    @ResponseStatus(value = HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<Error> handleException(Exception ex) {
        log.error("{}", getRootCauseMessage(ex));
        return new ResponseEntity<>(new InternalServerError("Internal server error"), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ResponseBody
    @ExceptionHandler({
            JsonMappingException.class,
            InvalidFormatException.class,
            UnexpectedTypeException.class,
            IllegalArgumentException.class,
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class
    })
    @ResponseStatus(value = HttpStatus.BAD_REQUEST)
    public ResponseEntity<Error> handleIllegalArgumentException(Exception ex) {
        String parameter = "unknown";
        String error = getRootCauseMessage(ex);
        Throwable throwable = getRootCause(ex);
        log.error("{}: {}", throwable, error);
        if (throwable instanceof MethodArgumentNotValidException) {
            Map<String, String> parameters = ((MethodArgumentNotValidException) throwable).getBindingResult()
                    .getFieldErrors()
                    .stream()
                    .collect(Collectors.toMap(FieldError::getField, DefaultMessageSourceResolvable::getDefaultMessage));
            parameter = String.join(", ", parameters.keySet());
            error = String.join("; ", parameters.values());
        } else if (throwable instanceof InvalidFormatException) {
            parameter = ((InvalidFormatException) throwable).getPath()
                    .stream()
                    .map(JsonMappingException.Reference::getFieldName)
                    .collect(Collectors.joining(", "));
            error = "Parameter [" + parameter + "] has wrong format";
        } else if (throwable instanceof JsonMappingException) {
            parameter = ((JsonMappingException) throwable).getPath()
                    .stream()
                    .map(JsonMappingException.Reference::getFieldName)
                    .collect(Collectors.joining(", "));
            error = "Parameter [" + parameter + "] has wrong format";
        } else if (throwable instanceof JsonParseException) {
            error = "Malformed JSON request";
        }
        return handleBioritmicException(new BioritmicException(parameter, error));
    }

    @ResponseBody
    @ExceptionHandler({BioritmicException.class})
    @ResponseStatus(value = HttpStatus.BAD_REQUEST)
    public ResponseEntity<Error> handleBioritmicException(BioritmicException ex) {
        return new ResponseEntity<>(BadRequestError.builder()
                .parameter(ofNullable(ex.getParameter()).orElse(""))
                .error(ofNullable(ex.getError()).orElse(""))
                .build(), HttpStatus.BAD_REQUEST);
    }
}
