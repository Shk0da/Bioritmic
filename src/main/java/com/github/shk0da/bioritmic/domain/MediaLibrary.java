package com.github.shk0da.bioritmic.domain;

import lombok.Data;

import java.util.List;

@Data
public class MediaLibrary {

    private Long id;
    private String name;
    private List<Media> mediaList;
}
