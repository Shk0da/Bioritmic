package com.github.shk0da.bioritmic.config;

import com.github.shk0da.bioritmic.util.DatabaseUtil;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.apache.ignite.Ignite;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Slf4j
@Configuration
@ConfigurationProperties(prefix = "spring.datasource")
@EntityScan(basePackages = {"com.github.shk0da.bioritmic.domain"})
@EnableJpaRepositories(basePackages = {"com.github.shk0da.bioritmic.repository"})
public class DataSourceConfig extends HikariConfig {

    public DataSourceConfig(Environment env, Ignite ignite) {
        setJdbcUrl(env.getProperty("spring.datasource.url"));
        log.info("Ignite: {}", ignite.name());
    }

    @Bean
    public DataSource dataSource() {
        DriverManagerDataSource driverManagerDataSource = new DriverManagerDataSource();
        driverManagerDataSource.setDriverClassName(getDriverClassName());
        driverManagerDataSource.setUrl(getJdbcUrl());
        driverManagerDataSource.setUsername(getUsername());
        driverManagerDataSource.setPassword(getPassword());
        DatabaseUtil.checkDataSource(driverManagerDataSource);

        HikariDataSource hikariDataSource = new HikariDataSource(this);
        hikariDataSource.setConnectionTimeout(250);
        return hikariDataSource;
    }
}