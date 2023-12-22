import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.springframework.boot") version "2.7.18"
    id("io.spring.dependency-management") version "1.1.0"
    kotlin("jvm") version "1.8.0"
    kotlin("plugin.spring") version "1.8.0"
    kotlin("plugin.jpa") version "1.8.0"
}

group = "com.github.shk0da.bioritmic"
version = "0.1"
java.sourceCompatibility = JavaVersion.VERSION_11

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springframework.boot:spring-boot-starter-batch")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-web")

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("io.projectreactor.kotlin:reactor-kotlin-extensions")

    implementation("io.micrometer:micrometer-core")
    implementation("io.dropwizard.metrics:metrics-core")
    implementation("io.dropwizard.metrics:metrics-annotation")
    implementation("io.dropwizard.metrics:metrics-json")
    implementation("io.dropwizard.metrics:metrics-jvm")
    implementation("io.dropwizard.metrics:metrics-servlet")
    implementation("io.dropwizard.metrics:metrics-servlets")

    implementation("net.logstash.logback:logstash-logback-encoder:6.4")

    implementation("org.jetbrains:annotations:19.0.0")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")

    testImplementation("io.projectreactor:reactor-test")
    testImplementation("org.springframework.batch:spring-batch-test")
    testImplementation("org.springframework.security:spring-security-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs = listOf("-Xjsr305=strict")
        jvmTarget = "11"
    }
}

// use like this: gradle -Pprofile=${profile} build
tasks.withType<ProcessResources> {
    if (project.hasProperty("profile")) {
        doLast {
            val applicationYml = file("${buildDir}/resources/main/application.yml")
            applicationYml.writer().use { writer ->
                val profile: String by project
                writer.append("\n\nspring.profiles.active: $profile")
            }
        }
    }
}