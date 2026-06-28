# Stage 1: Build
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY gradlew gradlew.bat ./
COPY gradle gradle
COPY build.gradle.kts ./
COPY api/build.gradle.kts api/

# Override settings.gradle.kts to include only :api (ui is built separately)
RUN printf 'rootProject.name = "bioritmic"\ninclude(":api")\n' > settings.gradle.kts

RUN ./gradlew :api:dependencies --no-daemon || true

COPY api/src api/src

RUN ./gradlew :api:bootJar --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system spring && adduser --system spring --ingroup spring
USER spring:spring

COPY --from=build /app/api/build/libs/*.jar app.jar

EXPOSE 6045 6046

ENTRYPOINT ["java", \
    "--add-opens", "java.base/java.lang=ALL-UNNAMED", \
    "--add-opens", "java.base/java.net=ALL-UNNAMED", \
    "--add-opens", "java.base/java.io=ALL-UNNAMED", \
    "--add-opens", "java.base/java.util=ALL-UNNAMED", \
    "-jar", "app.jar"]
