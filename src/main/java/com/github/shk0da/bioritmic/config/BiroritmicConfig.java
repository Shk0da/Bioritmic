package com.github.shk0da.bioritmic.config;

import lombok.Getter;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.annotation.PropertySources;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.web.cors.CorsConfiguration;

import javax.validation.constraints.NotNull;

@Getter
@EnableJpaRepositories
@SpringBootConfiguration
@ConfigurationProperties(prefix = "bioritmic", ignoreUnknownFields = false)
@PropertySources({
        @PropertySource(value = "classpath:git.properties", ignoreResourceNotFound = true),
        @PropertySource(value = "classpath:META-INF/build-info.properties", ignoreResourceNotFound = true)
})
public class BiroritmicConfig {

    public static final String APPLICATION_NAME = "Biroritmic";

    private final Http http = new Http();
    private final Security security = new Security();
    private final CorsConfiguration cors = new CorsConfiguration();
    private final Swagger swagger = new Swagger();
    private final Metrics metrics = new Metrics();
    private final Logging logging = new Logging();

    public static class Http {

        public enum Version {V_1_1, V_2_0}

        private final Cache cache = new Cache();

        /**
         * Https has to be active with cipher suite define also
         */
        private boolean useUndertowUserCipherSuitesOrder = BioritmicDefaults.Http.useUndertowUserCipherSuitesOrder;

        /**
         * HTTP version, must be "V_1_1" (for HTTP/1.1) or V_2_0 (for (HTTP/2)
         */
        public Version version = BioritmicDefaults.Http.version;

        public Cache getCache() {
            return cache;
        }

        public Version getVersion() {
            return version;
        }

        public void setVersion(Version version) {
            this.version = version;
        }

        public static class Cache {

            private int timeToLiveInDays = BioritmicDefaults.Http.Cache.timeToLiveInDays;

            public int getTimeToLiveInDays() {
                return timeToLiveInDays;
            }

            public void setTimeToLiveInDays(int timeToLiveInDays) {
                this.timeToLiveInDays = timeToLiveInDays;
            }
        }

        public boolean isUseUndertowUserCipherSuitesOrder() {
            return useUndertowUserCipherSuitesOrder;
        }

        public void setUseUndertowUserCipherSuitesOrder(boolean useUndertowUserCipherSuitesOrder) {
            this.useUndertowUserCipherSuitesOrder = useUndertowUserCipherSuitesOrder;
        }
    }

    public static class Security {

        private final ClientAuthorization clientAuthorization = new ClientAuthorization();

        private final Authentication authentication = new Authentication();

        private final RememberMe rememberMe = new RememberMe();

        public ClientAuthorization getClientAuthorization() {
            return clientAuthorization;
        }

        public Authentication getAuthentication() {
            return authentication;
        }

        public RememberMe getRememberMe() {
            return rememberMe;
        }

        public static class ClientAuthorization {

            private String accessTokenUri = BioritmicDefaults.Security.ClientAuthorization.accessTokenUri;

            private String tokenServiceId = BioritmicDefaults.Security.ClientAuthorization.tokenServiceId;

            private String clientId = BioritmicDefaults.Security.ClientAuthorization.clientId;

            private String clientSecret = BioritmicDefaults.Security.ClientAuthorization.clientSecret;

            public String getAccessTokenUri() {
                return accessTokenUri;
            }

            public void setAccessTokenUri(String accessTokenUri) {
                this.accessTokenUri = accessTokenUri;
            }

            public String getTokenServiceId() {
                return tokenServiceId;
            }

            public void setTokenServiceId(String tokenServiceId) {
                this.tokenServiceId = tokenServiceId;
            }

            public String getClientId() {
                return clientId;
            }

            public void setClientId(String clientId) {
                this.clientId = clientId;
            }

            public String getClientSecret() {
                return clientSecret;
            }

            public void setClientSecret(String clientSecret) {
                this.clientSecret = clientSecret;
            }
        }

        public static class Authentication {

            private final Jwt jwt = new Jwt();

            public Jwt getJwt() {
                return jwt;
            }

            public static class Jwt {

                private String secret = BioritmicDefaults.Security.Authentication.Jwt.secret;

                private long tokenValidityInSeconds = BioritmicDefaults.Security.Authentication.Jwt
                        .tokenValidityInSeconds;

                private long tokenValidityInSecondsForRememberMe = BioritmicDefaults.Security.Authentication.Jwt
                        .tokenValidityInSecondsForRememberMe;

                public String getSecret() {
                    return secret;
                }

                public void setSecret(String secret) {
                    this.secret = secret;
                }

                public long getTokenValidityInSeconds() {
                    return tokenValidityInSeconds;
                }

                public void setTokenValidityInSeconds(long tokenValidityInSeconds) {
                    this.tokenValidityInSeconds = tokenValidityInSeconds;
                }

                public long getTokenValidityInSecondsForRememberMe() {
                    return tokenValidityInSecondsForRememberMe;
                }

                public void setTokenValidityInSecondsForRememberMe(long tokenValidityInSecondsForRememberMe) {
                    this.tokenValidityInSecondsForRememberMe = tokenValidityInSecondsForRememberMe;
                }
            }
        }

        public static class RememberMe {

            @NotNull
            private String key = BioritmicDefaults.Security.RememberMe.key;

            public String getKey() {
                return key;
            }

            public void setKey(String key) {
                this.key = key;
            }
        }
    }

    public static class Swagger {

        private String title = BioritmicDefaults.Swagger.title;

        private String description = BioritmicDefaults.Swagger.description;

        private String version = BioritmicDefaults.Swagger.version;

        private String termsOfServiceUrl = BioritmicDefaults.Swagger.termsOfServiceUrl;

        private String contactName = BioritmicDefaults.Swagger.contactName;

        private String contactUrl = BioritmicDefaults.Swagger.contactUrl;

        private String contactEmail = BioritmicDefaults.Swagger.contactEmail;

        private String license = BioritmicDefaults.Swagger.license;

        private String licenseUrl = BioritmicDefaults.Swagger.licenseUrl;

        private String defaultIncludePattern = BioritmicDefaults.Swagger.defaultIncludePattern;

        private String host = BioritmicDefaults.Swagger.host;

        private String[] protocols = BioritmicDefaults.Swagger.protocols;

        private boolean useDefaultResponseMessages = BioritmicDefaults.Swagger.useDefaultResponseMessages;

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }

        public String getTermsOfServiceUrl() {
            return termsOfServiceUrl;
        }

        public void setTermsOfServiceUrl(String termsOfServiceUrl) {
            this.termsOfServiceUrl = termsOfServiceUrl;
        }

        public String getContactName() {
            return contactName;
        }

        public void setContactName(String contactName) {
            this.contactName = contactName;
        }

        public String getContactUrl() {
            return contactUrl;
        }

        public void setContactUrl(String contactUrl) {
            this.contactUrl = contactUrl;
        }

        public String getContactEmail() {
            return contactEmail;
        }

        public void setContactEmail(String contactEmail) {
            this.contactEmail = contactEmail;
        }

        public String getLicense() {
            return license;
        }

        public void setLicense(String license) {
            this.license = license;
        }

        public String getLicenseUrl() {
            return licenseUrl;
        }

        public void setLicenseUrl(String licenseUrl) {
            this.licenseUrl = licenseUrl;
        }

        public String getDefaultIncludePattern() {
            return defaultIncludePattern;
        }

        public void setDefaultIncludePattern(String defaultIncludePattern) {
            this.defaultIncludePattern = defaultIncludePattern;
        }

        public String getHost() {
            return host;
        }

        public void setHost(final String host) {
            this.host = host;
        }

        public String[] getProtocols() {
            return protocols;
        }

        public void setProtocols(final String[] protocols) {
            this.protocols = protocols;
        }

        public boolean isUseDefaultResponseMessages() {
            return useDefaultResponseMessages;
        }

        public void setUseDefaultResponseMessages(final boolean useDefaultResponseMessages) {
            this.useDefaultResponseMessages = useDefaultResponseMessages;
        }
    }

    public static class Metrics {

        private final Jmx jmx = new Jmx();

        private final Logs logs = new Logs();

        public Jmx getJmx() {
            return jmx;
        }

        public Logs getLogs() {
            return logs;
        }

        public static class Jmx {

            private boolean enabled = BioritmicDefaults.Metrics.Jmx.enabled;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }
        }

        public static class Logs {

            private boolean enabled = BioritmicDefaults.Metrics.Logs.enabled;

            private long reportFrequency = BioritmicDefaults.Metrics.Logs.reportFrequency;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public long getReportFrequency() {
                return reportFrequency;
            }

            public void setReportFrequency(long reportFrequency) {
                this.reportFrequency = reportFrequency;
            }
        }
    }

    public static class Logging {

        private final Logstash logstash = new Logstash();

        public Logstash getLogstash() {
            return logstash;
        }

        public static class Logstash {

            private boolean enabled = BioritmicDefaults.Logging.Logstash.enabled;

            private String host = BioritmicDefaults.Logging.Logstash.host;

            private int port = BioritmicDefaults.Logging.Logstash.port;

            private int queueSize = BioritmicDefaults.Logging.Logstash.queueSize;

            public boolean isEnabled() {
                return enabled;
            }

            public void setEnabled(boolean enabled) {
                this.enabled = enabled;
            }

            public String getHost() {
                return host;
            }

            public void setHost(String host) {
                this.host = host;
            }

            public int getPort() {
                return port;
            }

            public void setPort(int port) {
                this.port = port;
            }

            public int getQueueSize() {
                return queueSize;
            }

            public void setQueueSize(int queueSize) {
                this.queueSize = queueSize;
            }
        }
    }
}
