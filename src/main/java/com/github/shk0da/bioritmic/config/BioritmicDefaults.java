package com.github.shk0da.bioritmic.config;

public interface BioritmicDefaults {

    interface Async {
        int corePoolSize = 2;
        int maxPoolSize = 50;
        int queueCapacity = 10000;
    }

    interface Http {
        BiroritmicConfig.Http.Version version = BiroritmicConfig.Http.Version.V_1_1;
        boolean useUndertowUserCipherSuitesOrder = true;

        interface Cache {
            int timeToLiveInDays = 1461; // 4 years (including leap day)
        }
    }

    interface Security {
        interface ClientAuthorization {
            String accessTokenUri = null;
            String tokenServiceId = null;
            String clientId = null;
            String clientSecret = null;
        }

        interface Authentication {
            interface Jwt {
                String secret = null;
                long tokenValidityInSeconds = 1800; // 0.5 hour
                long tokenValidityInSecondsForRememberMe = 2592000; // 30 hours;
            }
        }

        interface RememberMe {
            String key = null;
        }
    }

    interface Swagger {
        String title = "Application API";
        String description = "API documentation";
        String version = "0.0.1";
        String termsOfServiceUrl = null;
        String contactName = null;
        String contactUrl = null;
        String contactEmail = null;
        String license = null;
        String licenseUrl = null;
        String defaultIncludePattern = "/api/.*";
        String host = null;
        String[] protocols = {};
        boolean useDefaultResponseMessages = true;
    }

    interface Metrics {
        interface Jmx {
            boolean enabled = true;
        }

        interface Logs {
            boolean enabled = false;
            long reportFrequency = 60;

        }
    }

    interface Logging {
        interface Logstash {
            boolean enabled = false;
            String host = "localhost";
            int port = 5000;
            int queueSize = 512;
        }
    }
}
