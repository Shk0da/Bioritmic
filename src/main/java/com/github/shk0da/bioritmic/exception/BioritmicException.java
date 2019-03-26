package com.github.shk0da.bioritmic.exception;

import lombok.Getter;

@Getter
public class BioritmicException extends RuntimeException {

    private String parameter;
    private String error;

    public BioritmicException(String error) {
        this.error = error;
    }

    public BioritmicException(String parameter, String error) {
        this.parameter = parameter;
        this.error = error;
    }
}
