package com.github.shk0da.bioritmic.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;
import org.apache.ignite.cache.query.annotations.QuerySqlField;

import javax.persistence.Id;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import java.util.Set;

@Data
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class User implements Serializable {

    @QuerySqlField(index = true)
    @Id
    private Long id;

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
    private Set<MediaLibrary> mediaLibraries;

    @QuerySqlField
    private Set<User> phoneBook;
}
