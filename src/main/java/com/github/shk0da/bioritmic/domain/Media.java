package com.github.shk0da.bioritmic.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ignite.cache.query.annotations.QuerySqlField;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.io.Serializable;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "media")
public class Media implements Serializable {

    public static final String CACHE_NAME = "mediaCache";

    public enum Type {photo, video, audio, text}

    @Id
    @QuerySqlField
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @QuerySqlField
    private Type type;

    @QuerySqlField
    private String name;

    @QuerySqlField
    private String src;
}
