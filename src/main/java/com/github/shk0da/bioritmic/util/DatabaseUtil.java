package com.github.shk0da.bioritmic.util;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.concurrent.TimeUnit;

@Slf4j
@UtilityClass
public final class DatabaseUtil {

    /**
     * @param dataSource {@link DataSource}
     */
    public static void checkDataSource(DataSource dataSource) {
        try (Statement statement = dataSource.getConnection().createStatement()) {
            statement.executeQuery("select 1");
            log.info("Connection to the database is established");
        } catch (SQLException e) {
            log.warn("No database connection");
            try {
                TimeUnit.SECONDS.sleep(1);
            } catch (InterruptedException e1) {
                e1.printStackTrace();
            }
            log.warn("Attempt to re-establish the connection");
            checkDataSource(dataSource);
        }
    }
}