package com.github.shk0da.bioritmic

import com.github.shk0da.bioritmic.api.ApiApplication
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants
import com.github.shk0da.bioritmic.configuration.DataSourceTestConfiguration
import com.github.shk0da.bioritmic.configuration.S3TestConfiguration
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
import org.springframework.http.MediaType
import org.springframework.test.web.reactive.server.WebTestClient
import org.springframework.web.reactive.function.BodyInserters
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import java.util.UUID

@ExtendWith(SpringExtension::class)
@AutoConfigureWebTestClient(timeout = "36000")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(
    classes = [
        DataSourceTestConfiguration::class,
        S3TestConfiguration::class,
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
        val tables = listOf(
            "story_reactions",
            "story_views",
            "stories",
            "user_push_tokens",
            "user_roles",
            "user_photos",
            "profile_boosts",
            "subscriptions",
            "reports",
            "user_feedback",
            "admin_audit_log",
            "bans",
            "user_blocks",
            "meetings",
            "mailbox",
            "bookmarks",
            "gis_data",
            "authorizations",
            "user_settings",
            "users",
        )

        liquibaseDataSource.connection.use { connection ->
            try {
                connection.prepareStatement(
                    "TRUNCATE TABLE ${tables.joinToString(", ")} RESTART IDENTITY CASCADE"
                ).execute()
            } catch (ex: Exception) {
                log.warn("TRUNCATE failed, falling back to DELETE: {}", ex.message)
                tables.forEach { table ->
                    try {
                        connection.prepareStatement("DELETE FROM $table").execute()
                    } catch (_: Exception) {
                        // Ignore errors for tables that don't exist yet
                    }
                }
            }
        }

        authTokenCache.clear()
    }

    protected fun registerSeedAdminUser() {
        registerUserViaApi(
            email = "seed_admin_${UUID.randomUUID()}@gmail.com",
            name = "Seed Admin",
        )
    }

    protected fun registerUserViaApi(
        email: String,
        name: String = "Test User",
        password: String = "Test12345",
        birthday: String = "1990-01-01",
    ) {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                BodyInserters.fromValue(
                    mapOf(
                        "name" to name,
                        "email" to email,
                        "password" to password,
                        "birthday" to birthday,
                    )
                )
            )
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
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
