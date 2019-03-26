package com.github.shk0da.bioritmic.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ignite.cache.query.annotations.QuerySqlField;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;
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
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    @Column(name = "login")
    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [login] is missed")
    private String login;

    @QuerySqlField(index = true)
    @Email(message = "Parameter [email] has wrong format")
    @NotNull(message = "Mandatory parameter [email] is missed")
    private String email;

    @QuerySqlField(index = true)
    @Pattern(regexp = "^((\\+[1-9]?[0-9])|0)?[7-9][0-9]{9}$", message = "Parameter [phone] has wrong format")
    private String phone;

    @Column(name = "birth_date")
    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [birthDate] is missed")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy")
    private Date birthDate;

    @QuerySqlField(index = true)
    @NotNull(message = "Mandatory parameter [birthDate] is missed")
    private Gender gender;

    @QuerySqlField
    private String status;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @QuerySqlField
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private Set<MediaLibrary> mediaLibraries;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @OneToMany(fetch = FetchType.LAZY)
    @QuerySqlField
    private Set<User> phoneBook;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @NotNull(message = "Mandatory parameter [password] is missed")
    @Size(min = 1, max = 60, message = "Mandatory parameter [password] has wrong size")
    @Column(name = "password_hash", length = 60)
    private String password;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @QuerySqlField
    private Boolean activated;

    @Builder.Default
    @JsonIgnore
    @ManyToMany
    @JoinTable(
            name = "user_authority",
            joinColumns = {@JoinColumn(name = "user_id", referencedColumnName = "id")},
            inverseJoinColumns = {@JoinColumn(name = "authority_name", referencedColumnName = "name")})
    @Cache(usage = CacheConcurrencyStrategy.NONSTRICT_READ_WRITE)
    @BatchSize(size = 20)
    private Set<Authority> authorities = Sets.newHashSet();

    public String getPhone() {
        return phone != null ? phone : "";
    }

    public Set<MediaLibrary> getMediaLibraries() {
        return mediaLibraries != null ? mediaLibraries : Sets.newHashSet();
    }

    public Set<User> getPhoneBook() {
        return phoneBook != null ? phoneBook : Sets.newHashSet();
    }
}