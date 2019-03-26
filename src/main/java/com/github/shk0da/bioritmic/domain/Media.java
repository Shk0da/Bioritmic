package com.github.shk0da.bioritmic.domain;

import lombok.Data;

@Data
public class Media {

    public enum Type {
        photo, video, audio, text
    }

    private Long id;
    private Type type;
    private String name;
    private String src;
}
