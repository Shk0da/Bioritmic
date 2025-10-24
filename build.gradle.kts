plugins {
    kotlin("jvm") version "2.0.21"
    id("io.gitlab.arturbosch.detekt") version "1.23.8"
}

allprojects {
    group = "com.github.shk0da.bioritmic"
    version = "0.1.0-SNAPSHOT"
    repositories {
        mavenCentral()
    }
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

dependencies {
    // kotlin
    implementation(kotlin("stdlib-jdk8"))
}
