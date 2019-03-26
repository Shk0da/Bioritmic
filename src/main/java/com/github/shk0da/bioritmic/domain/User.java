package com.github.shk0da.bioritmic.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ignite.cache.query.annotations.QuerySqlField;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import java.io.Serializable;
import java.util.Date;
import java.util.Set;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
@JsonIgnoreProperties(ignoreUnknown = true)
public class User implements Serializable {

    public static final String CACHE_NAME = "userCache";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @QuerySqlField(index = true)
    private Long id;

    @Column(name = "login")
    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [nickname] is missed")
    private String nickname;

    @QuerySqlField(index = true)
    @Email
    @NotNull(message = "Mandatory parameter [email] is missed")
    private String email;

    @QuerySqlField(index = true)
    @Pattern(regexp = "^((\\+[1-9]?[0-9])|0)?[7-9][0-9]{9}$", message = "Parameter [phone] has wrong format")
    private String phone;

    @Column(name = "birth_date")
    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [birthDate] is missed")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private Date birthDate;

    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [gender] is missed")
    private Gender gender;

    @QuerySqlField
    private String status;

    @QuerySqlField
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private Set<MediaLibrary> mediaLibraries;

    @OneToMany(fetch = FetchType.LAZY)
    @QuerySqlField
    private Set<User> phoneBook;

    @Column(name = "password_hash")
    private String passwordHash;

    @QuerySqlField
    private Boolean activated;
}
