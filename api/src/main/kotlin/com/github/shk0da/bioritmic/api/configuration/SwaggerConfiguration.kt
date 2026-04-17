package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants.Companion.SPRING_PROFILE_SWAGGER
import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Contact
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springdoc.core.models.GroupedOpenApi
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.info.BuildProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import java.util.Optional

@Configuration
@Profile(SPRING_PROFILE_SWAGGER)
class OpenApiConfiguration {

    @Autowired
    private lateinit var buildProperties: Optional<BuildProperties>

    private fun version(): String =
        if (buildProperties.isPresent) "${buildProperties.get().version}/${buildProperties.get()["revision"]}" else "snapshot"

    @Bean
    fun customOpenAPI(
        @Value("\${spring.application.name}") applicationName: String?,
        @Value("\${spring.application.description}") description: String?
    ): OpenAPI {
        return OpenAPI()
            .components(
                Components().addSecuritySchemes(
                    "Bearer",
                    SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .name("Authorization")
                        .`in`(SecurityScheme.In.HEADER)
                )
            )
            .addSecurityItem(SecurityRequirement().addList("Bearer"))
            .info(
                Info()
                    .title(applicationName)
                    .description(description)
                    .version(version())
                    .contact(Contact().name("API Team"))
            )
    }

    @Bean
    fun v1GroupedOpenApi(): GroupedOpenApi =
        GroupedOpenApi.builder()
            .group("v1")
            .packagesToScan("com.github.shk0da.bioritmic.api.controller")
            .pathsToMatch("${ApiRoutes.API_WITH_VERSION_1}/**")
            .build()
}
