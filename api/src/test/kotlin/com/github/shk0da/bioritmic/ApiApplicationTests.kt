package com.github.shk0da.bioritmic

import com.github.shk0da.bioritmic.api.ApiApplication
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants
import com.github.shk0da.bioritmic.configuration.DataSourceTestConfiguration
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.ContextConfiguration
import org.springframework.test.context.junit.jupiter.SpringExtension
import org.springframework.test.web.reactive.server.WebTestClient

@ExtendWith(SpringExtension::class)
@AutoConfigureWebTestClient(timeout = "36000")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(
    classes = [
        DataSourceTestConfiguration::class,
        ApiApplication::class,
    ]
)
@ActiveProfiles(ProfileConfigConstants.SPRING_PROFILE_TEST, ProfileConfigConstants.SPRING_PROFILE_PG_EMBEDDED)
class ApiApplicationTests {

    private val log = LoggerFactory.getLogger(ApiApplicationTests::class.java)

    @Autowired
    lateinit var webTestClient: WebTestClient

    @Autowired
    lateinit var liquibaseDataSource: DriverManagerDataSource

    @Autowired
    lateinit var authTokenCache: org.infinispan.Cache<String, com.github.shk0da.bioritmic.api.domain.Auth>

    @BeforeEach
    fun clearDatabase() {
        // Clear database tables
        val tables = listOf(
            "user_blocks",
            "meetings",
            "mailbox",
            "bookmarks",
            "gis_data",
            "authorizations",
            "user_settings",
            "users"
        )

        tables.forEach { table ->
            try {
                liquibaseDataSource.connection.prepareStatement("DELETE FROM $table").execute()
            } catch (_: Exception) {
                // Ignore errors for tables that don't exist yet
            }
        }

        // Clear auth token cache
        authTokenCache.clear()
    }

    @AfterEach
    fun clearCache() {
        // Clear auth token cache after each test
        authTokenCache.clear()
    }

    @Test
    fun contextLoads() {
        log.info("Run tests")
    }
}
