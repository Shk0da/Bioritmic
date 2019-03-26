package com.github.shk0da.bioritmic.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ignite.cache.query.annotations.QuerySqlField;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import java.io.Serializable;
import java.util.Date;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "locations")
public class Location implements Serializable {

    public static final String CACHE_NAME = "locationCache";

    @Id
    @Column(name = "user_id")
    @QuerySqlField(index = true)
    private Long userId;

    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [latitude] is missed")
    private Double latitude;

    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [longitude] is missed")
    private Double longitude;

    @QuerySqlField(index = true)
    private Date timestamp;
}
