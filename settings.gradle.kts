pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

buildscript {
    repositories {
        mavenCentral()
    }
}

rootProject.name = "bioritmic"

include(":api")
include(":ui")
