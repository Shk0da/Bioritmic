package com.github.shk0da.bioritmic

import com.github.shk0da.bioritmic.api.ApiApplication
import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants
import com.github.shk0da.bioritmic.configuration.DataSourceTestConfiguration
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.ContextConfiguration
import org.springframework.test.context.junit.jupiter.SpringExtension
import org.springframework.test.web.reactive.server.WebTestClient

@ExtendWith(SpringExtension::class)
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

    @Test
    fun contextLoads() {
        log.info("Run tests")
    }
}
