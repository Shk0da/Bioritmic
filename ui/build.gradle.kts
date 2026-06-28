plugins {
    base
    id("com.github.node-gradle.node") version "7.1.0"
}

node {
    download.set(false)
    version.set("20.11.0")
    npmVersion.set("10.2.4")
    nodeProjectDir.set(file("${project.projectDir}"))
}

val npmCmd = if (System.getProperty("os.name").lowercase().contains("win")) "npm.cmd" else "npm"

val buildUi = tasks.register<Exec>("buildUi") {
    dependsOn(tasks.npmInstall)
    inputs.files(fileTree("src"))
    inputs.files("package.json", "package-lock.json", "angular.json", "tsconfig.json", "scripts/inject-build-version.mjs")
    outputs.dir("build/dist")
    commandLine(npmCmd, "run", "build")
    environment("PATH", System.getenv("PATH"))
}

val serveUi = tasks.register<Exec>("serveUi") {
    dependsOn(tasks.npmInstall)
    commandLine(npmCmd, "run", "start")
    environment("PATH", System.getenv("PATH"))
}

tasks.build {
    dependsOn(buildUi)
}
