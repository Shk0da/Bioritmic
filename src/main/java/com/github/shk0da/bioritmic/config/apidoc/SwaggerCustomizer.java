package com.github.shk0da.bioritmic.config.apidoc;

import com.github.shk0da.bioritmic.config.BiroritmicConfig;
import org.springframework.core.Ordered;
import org.springframework.http.ResponseEntity;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.service.Contact;
import springfox.documentation.spring.web.plugins.Docket;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;

public class SwaggerCustomizer implements Ordered {

    private int order = 0;
    private final BiroritmicConfig.Swagger properties;

    public SwaggerCustomizer(BiroritmicConfig.Swagger properties) {
        this.properties = properties;
    }

    public void customize(Docket docket) {
        Contact contact = new Contact(
                properties.getContactName(),
                properties.getContactUrl(),
                properties.getContactEmail()
        );
        ApiInfo apiInfo = new ApiInfo(
                properties.getTitle(),
                properties.getDescription(),
                properties.getVersion(),
                properties.getTermsOfServiceUrl(),
                contact,
                properties.getLicense(),
                properties.getLicenseUrl(),
                new ArrayList()
        );
        docket.host(properties.getHost())
                .protocols(new HashSet(Arrays.asList(properties.getProtocols())))
                .apiInfo(apiInfo)
                .useDefaultResponseMessages(properties.isUseDefaultResponseMessages())
                .forCodeGeneration(true)
                .directModelSubstitute(ByteBuffer.class, String.class)
                .genericModelSubstitutes(new Class[]{ResponseEntity.class})
                .select()
                .paths(PathSelectors.regex(properties.getDefaultIncludePattern()))
                .build();
    }

    public void setOrder(int order) {
        this.order = order;
    }

    @Override
    public int getOrder() {
        return this.order;
    }
}
