package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.constants.ProfileConfigConstants
import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.info.BuildProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import springfox.documentation.builders.PathSelectors
import springfox.documentation.builders.RequestHandlerSelectors
import springfox.documentation.oas.annotations.EnableOpenApi
import springfox.documentation.service.*
import springfox.documentation.spi.DocumentationType
import springfox.documentation.spi.service.contexts.SecurityContext
import springfox.documentation.spring.web.plugins.Docket
import java.util.*


@Configuration
@EnableOpenApi
@Profile(value = [ProfileConfigConstants.SPRING_PROFILE_SWAGGER])
class SwaggerConfiguration {

    @Autowired
    private lateinit var buildProperties: Optional<BuildProperties>

    private val apiKey: SecurityScheme = ApiKey("Bearer", "Authorization", "header")
    private val defaultAuth = arrayListOf(
            SecurityReference("Bearer", arrayOf(AuthorizationScope("global", "accessEverything")))
    )
    private val securityContext: SecurityContext = SecurityContext.builder().securityReferences(defaultAuth).build()

    fun version(): String? = if (buildProperties.isPresent) "${buildProperties.get().version}/${buildProperties.get()["revision"]}" else null

    @Bean
    fun api(@Value("\${spring.application.name}") applicationName: String?,
            @Value("\${spring.application.description}") description: String?): Docket {
        return Docket(DocumentationType.SWAGGER_2)
                .securitySchemes(arrayListOf(apiKey))
                .securityContexts(arrayListOf(securityContext))
                .useDefaultResponseMessages(false)
                .directModelSubstitute(ResponseEntity::class.java, Void::class.java)
                .ignoredParameterTypes(Pageable::class.java)
                .apiInfo(ApiInfo(
                        applicationName,
                        description,
                        Optional.ofNullable(version()).orElse("snapshot"),
                        "",
                        Contact("API Team", "", ""),
                        "",
                        "",
                        ApiInfo.DEFAULT.vendorExtensions
                ))
                .select()
                .apis(RequestHandlerSelectors.basePackage("com.github.shk0da.bioritmic.api.controller"))
                .paths(PathSelectors.regex(ApiRoutes.API_WITH_VERSION_1 + "/.*"))
                .build()
    }
}
