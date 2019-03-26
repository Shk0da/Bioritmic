package com.github.shk0da.bioritmic.config.apidoc;

import com.github.shk0da.bioritmic.config.BiroritmicConfig;
import com.github.shk0da.bioritmic.config.ProfileConfigConstants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import springfox.documentation.swagger.web.SwaggerResource;
import springfox.documentation.swagger.web.SwaggerResourcesProvider;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Primary
@Profile(ProfileConfigConstants.SPRING_PROFILE_SWAGGER)
public class RegistrySwaggerResourcesProvider implements SwaggerResourcesProvider {

    @Override
    public List<SwaggerResource> get() {
        List<SwaggerResource> resources = new ArrayList<>();
        // Add the registry swagger resource that correspond to the own swagger doc
        resources.add(swaggerResource(BiroritmicConfig.APPLICATION_NAME, "/v2/api-docs"));
        // Add the registered microservices swagger docs as additional swagger resources
        // ...
        return resources;
    }

    private SwaggerResource swaggerResource(String name, String location) {
        SwaggerResource swaggerResource = new SwaggerResource();
        swaggerResource.setName(name);
        swaggerResource.setLocation(location);
        swaggerResource.setSwaggerVersion("2.0");
        return swaggerResource;
    }
}
