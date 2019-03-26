package com.github.shk0da.bioritmic.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ignite.cache.query.annotations.QuerySqlField;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import java.io.Serializable;
import java.util.Set;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "media_library")
public class MediaLibrary implements Serializable {

    public static final String CACHE_NAME = "mediaLibraryCache";

    @Id
    @QuerySqlField
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @QuerySqlField
    private String name;

    @QuerySqlField
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private Set<Media> mediaList;
}
