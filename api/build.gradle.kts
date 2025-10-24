plugins {
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.spring") version "2.0.21"
    id("org.springframework.boot") version "2.7.0"
    id("io.spring.dependency-management") version "1.1.7"
    id("io.gitlab.arturbosch.detekt") version "1.23.8"
}

version = "0.0.1-SNAPSHOT"

dependencies {
    // jakarta
    implementation("javax.validation:validation-api:2.0.1.Final")
    implementation("jakarta.annotation:jakarta.annotation-api:3.0.0")
    implementation("jakarta.validation:jakarta.validation-api:3.1.1")

    // kotlin
    implementation(kotlin("stdlib-jdk8"))
    implementation(libs.bundles.kotlinx.coroutines)
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("io.projectreactor.kotlin:reactor-kotlin-extensions")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")

    // spring
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springframework.boot:spring-boot-starter-batch")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-data-r2dbc")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("org.springframework.retry:spring-retry")

    // swagger
    implementation("io.springfox:springfox-boot-starter:3.0.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("io.projectreactor.kotlin:reactor-kotlin-extensions")

    // metrics
    implementation("io.micrometer:micrometer-core")
    implementation("io.dropwizard.metrics:metrics-core")
    implementation("io.dropwizard.metrics:metrics-annotation")
    implementation("io.dropwizard.metrics:metrics-json")
    implementation("io.dropwizard.metrics:metrics-jvm")
    implementation("io.dropwizard.metrics:metrics-servlet")
    implementation("io.dropwizard.metrics:metrics-servlets")
    implementation("org.springframework.plugin:spring-plugin-core")

    // logging
    implementation("net.logstash.logback:logstash-logback-encoder:6.4")

    // postgres
    implementation("org.liquibase:liquibase-core")
    implementation("javax.persistence:javax.persistence-api:2.2")
    runtimeOnly("org.postgresql:postgresql:42.7.8")
    runtimeOnly("org.postgresql:r2dbc-postgresql:1.0.7.RELEASE")

    // cache
    implementation("org.infinispan:infinispan-spring-boot-starter-embedded:2.3.4.Final")

    // test
    testImplementation("org.springframework.boot:spring-boot-starter-test") {
        exclude(group = "org.junit.vintage", module = "junit-vintage-engine")
    }
    testImplementation("io.projectreactor:reactor-test")
    testImplementation("org.springframework.batch:spring-batch-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:jdbc:1.15.1")
    testImplementation("org.testcontainers:r2dbc:1.15.1")
    testImplementation("org.testcontainers:postgresql:1.15.1")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

tasks.withType<JavaExec> {
    jvmArgs = listOf(
        "--add-opens", "java.base/java.lang=ALL-UNNAMED",
        "--add-opens", "java.base/java.net=ALL-UNNAMED",
        "--add-opens", "java.base/java.io=ALL-UNNAMED",
        "--add-opens", "java.base/java.util=ALL-UNNAMED"
    )
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// use like this: gradle -Pprofile=${profile} build
tasks.withType<ProcessResources> {
    if (project.hasProperty("profile")) {
        doLast {
            val applicationYml = file("${layout.buildDirectory}/resources/main/application.yml")
            applicationYml.writer().use { writer ->
                val profile: String by project
                writer.append("\n\nspring.profiles.active: $profile")
            }
        }
    }
}

detekt {
    autoCorrect = true
}
