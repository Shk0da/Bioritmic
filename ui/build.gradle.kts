plugins {
    base
    id("com.github.node-gradle.node") version "7.1.0"
}

node {
    download.set(true)
    version.set("20.11.0")
    npmVersion.set("10.2.4")
    nodeProjectDir.set(file("${project.projectDir}"))
}

val buildUi by tasks.registering(Exec::class) {
    dependsOn(tasks.npmInstall)
    inputs.files(fileTree("src"))
    inputs.files("package.json", "package-lock.json", "angular.json", "tsconfig.json")
    outputs.dir("build/dist")
    commandLine("npm", "run", "build")
}

val serveUi by tasks.registering(Exec::class) {
    dependsOn(tasks.npmInstall)
    commandLine("npm", "run", "start")
}

tasks.build {
    dependsOn(buildUi)
}
