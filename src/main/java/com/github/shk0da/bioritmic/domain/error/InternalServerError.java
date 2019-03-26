package com.github.shk0da.bioritmic.domain.error;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class InternalServerError implements Error {
    private String error;
}
