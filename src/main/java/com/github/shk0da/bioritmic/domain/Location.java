package com.github.shk0da.bioritmic.domain;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class Location {

    private User user;

    @NotNull(message = "Mandatory parameter [latitude] is missed")
    private Double latitude;

    @NotNull(message = "Mandatory parameter [longitude] is missed")
    private Double longitude;
}
