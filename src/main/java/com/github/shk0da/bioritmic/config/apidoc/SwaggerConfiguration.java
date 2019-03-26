package com.github.shk0da.bioritmic.config.apidoc;

import com.github.shk0da.bioritmic.config.BiroritmicConfig;
import com.github.shk0da.bioritmic.config.ProfileConfigConstants;
import com.github.shk0da.bioritmic.controller.rest.ApiRoutes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StopWatch;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.DispatcherServlet;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.schema.AlternateTypeRule;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.service.ApiKey;
import springfox.documentation.service.AuthorizationScope;
import springfox.documentation.service.SecurityReference;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spi.service.contexts.SecurityContext;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

import javax.servlet.Servlet;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@Configuration
@EnableSwagger2
@ConditionalOnWebApplication
@ConditionalOnClass({ApiInfo.class, Servlet.class, DispatcherServlet.class})
@Profile(ProfileConfigConstants.SPRING_PROFILE_SWAGGER)
@AutoConfigureAfter({BiroritmicConfig.class})
public class SwaggerConfiguration {

    public static final String STARTING_MESSAGE = "Starting Swagger";
    public static final String STARTED_MESSAGE = "Started Swagger in {} ms";
    public static final String MANAGEMENT_TITLE_SUFFIX = "Management API";
    public static final String MANAGEMENT_GROUP_NAME = "management";
    public static final String MANAGEMENT_DESCRIPTION = "Management endpoints documentation";

    private final Logger log = LoggerFactory.getLogger(SwaggerConfiguration.class);
    private final BiroritmicConfig.Swagger properties;

    public SwaggerConfiguration(BiroritmicConfig biroritmicConfig) {
        this.properties = biroritmicConfig.getSwagger();
    }

    @Bean
    @ConditionalOnMissingBean(
            name = {"swaggerSpringfoxApiDocket"}
    )
    public Docket swaggerSpringfoxApiDocket(List<SwaggerCustomizer> swaggerCustomizers, ObjectProvider<AlternateTypeRule[]> alternateTypeRules) {
        log.debug(STARTING_MESSAGE);
        StopWatch watch = new StopWatch();
        watch.start();
        Docket docket = this.createDocket();
        swaggerCustomizers.forEach((customizer) -> customizer.customize(docket));
        Optional.ofNullable(alternateTypeRules.getIfAvailable()).ifPresent(docket::alternateTypeRules);
        watch.stop();
        log.debug(STARTED_MESSAGE, watch.getTotalTimeMillis());
        return docket;
    }

    @Bean
    public SwaggerCustomizer swaggerCustomizer() {
        return new SwaggerCustomizer(properties);
    }

    @Bean
    @ConditionalOnClass(
            name = {"org.springframework.boot.actuate.autoconfigure.ManagementServerProperties"}
    )
    @ConditionalOnProperty({"management.endpoints.web.base-path"})
    @ConditionalOnExpression("'${management.endpoints.web.base-path}'.length() > 0")
    @ConditionalOnMissingBean(
            name = {"swaggerSpringfoxManagementDocket"}
    )
    public Docket swaggerSpringfoxManagementDocket(@Value("${spring.application.name:application}") String appName,
                                                   @Value("${management.endpoints.web.base-path}") String managementContextPath) {
        ApiInfo apiInfo = new ApiInfo(
                StringUtils.capitalize(appName) + " " + MANAGEMENT_TITLE_SUFFIX,
                MANAGEMENT_DESCRIPTION,
                properties.getVersion(),
                "",
                ApiInfo.DEFAULT_CONTACT,
                "",
                "",
                new ArrayList<>()
        );
        return this.createDocket()
                .apiInfo(apiInfo)
                .useDefaultResponseMessages(properties.isUseDefaultResponseMessages())
                .groupName(MANAGEMENT_GROUP_NAME)
                .host(properties.getHost())
                .protocols(new HashSet<>(Arrays.asList(properties.getProtocols())))
                .forCodeGeneration(true)
                .directModelSubstitute(ByteBuffer.class, String.class)
                .genericModelSubstitutes(new Class[]{ResponseEntity.class})
                .select()
                .paths(PathSelectors.regex(managementContextPath + ".*"))
                .build()
                .securitySchemes(Collections.singletonList(apiKey()))
                .securityContexts(Collections.singletonList(securityContext()));
    }

    protected Docket createDocket() {
        return new Docket(DocumentationType.SWAGGER_2);
    }

    private ApiKey apiKey() {
        return new ApiKey("Bearer", "Authorization", "header");
    }

    private SecurityContext securityContext() {
        return SecurityContext.builder()
                .securityReferences(defaultAuth())
                .forPaths(PathSelectors.regex(ApiRoutes.API_PATH + "/.*"))
                .build();
    }

    private List<SecurityReference> defaultAuth() {
        final AuthorizationScope authorizationScope = new AuthorizationScope("global", "accessEverything");
        final AuthorizationScope[] authorizationScopes = new AuthorizationScope[]{authorizationScope};
        return Collections.singletonList(new SecurityReference("Bearer", authorizationScopes));
    }
}
