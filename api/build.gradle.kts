plugins {
    kotlin("jvm") version "2.1.10"
    kotlin("plugin.spring") version "2.1.10"
    id("org.springframework.boot") version "4.0.5"
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
    implementation("org.springframework.boot:spring-boot-starter-batch")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-data-r2dbc")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("org.springframework.boot:spring-boot-starter-liquibase")
    implementation("org.springframework.retry:spring-retry")

    // swagger
    implementation("org.springdoc:springdoc-openapi-starter-webflux-ui:3.0.3")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("io.projectreactor.kotlin:reactor-kotlin-extensions")

    // metrics
    implementation("io.micrometer:micrometer-core")

    // logging
    implementation("net.logstash.logback:logstash-logback-encoder:6.4")

    // postgres
    implementation("org.postgresql:postgresql:42.7.10")
    implementation("io.r2dbc:r2dbc-pool:1.0.2.RELEASE")
    implementation("org.postgresql:r2dbc-postgresql:1.1.1.RELEASE")

    // cache
    implementation("org.infinispan:infinispan-spring-boot4-starter-embedded:16.1.3")

    // S3 (MinIO)
    implementation("software.amazon.awssdk:s3:2.31.1")

    // Firebase Admin SDK
    implementation("com.google.firebase:firebase-admin:9.2.0")

    // test
    testImplementation("org.springframework.boot:spring-boot-webtestclient")
    testImplementation("org.springframework.boot:spring-boot-webclient-test")
    testImplementation("org.springframework.boot:spring-boot-starter-test") {
        exclude(group = "org.junit.vintage", module = "junit-vintage-engine")
    }
    testImplementation("io.projectreactor:reactor-test")
    testImplementation("org.springframework.batch:spring-batch-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:jdbc:1.21.4")
    testImplementation("org.testcontainers:postgresql:1.21.4")
    testImplementation("org.testcontainers:r2dbc:1.21.4")
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
