pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
    }
}

buildscript {
    repositories {
        mavenCentral()
    }
}

rootProject.name = "bioritmic"

include(":api")
include(":ui")
