plugins {
    kotlin("jvm") version "2.4.0"
    id("dev.detekt") version "2.0.0-alpha.5"
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
        languageVersion = JavaLanguageVersion.of(25)
    }
}

dependencies {
    // kotlin
    implementation(kotlin("stdlib-jdk8"))
}

// Задача для запуска UI сервера разработки
tasks.register("startUi") {
    group = "ui"
    description = "Запуск Angular UI сервера разработки"
    dependsOn(":ui:serveUi")
}

// Задача для сборки UI
tasks.register("buildUi") {
    group = "ui"
    description = "Сборка Angular UI приложения"
    dependsOn(":ui:buildUi")
}
