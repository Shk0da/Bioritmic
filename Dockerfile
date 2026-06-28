# syntax=docker/dockerfile:1

# --- API build ---
FROM eclipse-temurin:21-jdk AS api-build
WORKDIR /app
COPY gradlew gradlew.bat ./
COPY gradle gradle
COPY build.gradle.kts ./
COPY api/build.gradle.kts api/
RUN printf 'rootProject.name = "bioritmic"\ninclude(":api")\n' > settings.gradle.kts
RUN ./gradlew :api:dependencies --no-daemon || true
COPY api/src api/src
RUN ./gradlew :api:bootJar --no-daemon

# --- UI build ---
FROM node:20-bookworm AS ui-build
WORKDIR /app
COPY ui/package.json ui/package-lock.json* ./
RUN npm ci || npm install
COPY ui/ ./
RUN npm run build

# --- Monolith runtime ---
FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PGDATA=/var/lib/postgresql/data \
    MINIO_ROOT_USER=bioritmic \
    MINIO_ROOT_PASSWORD=bioritmic \
    S3_BUCKET=bioritmic \
    MAIL_FROM=noreply@bioritmic.ru \
    MAIL_FROM_NAME=Bioritmic

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gosu locales nginx openssl openjdk-21-jre-headless postfix postgresql-16 python3-pip supervisor \
    && pip3 install --break-system-packages 'certbot>=5.3' \
    && locale-gen en_US.UTF-8 C.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://dl.min.io/server/minio/release/linux-amd64/minio -o /usr/local/bin/minio \
    && curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
    && chmod +x /usr/local/bin/minio /usr/local/bin/mc

COPY docker/monolith/postfix/main.cf /etc/postfix/main.cf
COPY docker/monolith/nginx.conf /etc/nginx/sites-available/default
COPY docker/monolith/nginx-locations.conf /etc/nginx/bioritmic-locations.conf
COPY docker/monolith/nginx-ssl-redirect-map.conf /etc/nginx/conf.d/bioritmic-ssl-redirect-map.conf
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default \
    && rm -f /etc/nginx/sites-enabled/default.bak \
    && echo 'include /etc/nginx/bioritmic-locations.conf;' > /etc/nginx/bioritmic-port80-extra.conf \
    && touch /etc/nginx/bioritmic-https.conf \
    && postconf compatibility_level=3.6 \
    && newaliases \
    && postfix check

COPY docker/monolith/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/monolith/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/monolith/init-postgres.sh /usr/local/bin/init-postgres.sh
COPY docker/monolith/minio-init.sh /usr/local/bin/minio-init.sh
COPY docker/monolith/start-api.sh /usr/local/bin/start-api.sh
COPY docker/monolith/generate-ssl-cert.sh /usr/local/bin/generate-ssl-cert.sh
COPY docker/monolith/ssl-env.sh /usr/local/bin/ssl-env.sh
COPY docker/monolith/ssl-ip-fallback.sh /usr/local/bin/ssl-ip-fallback.sh
COPY docker/monolith/configure-nginx.sh /usr/local/bin/configure-nginx.sh
COPY docker/monolith/configure-supervisord.sh /usr/local/bin/configure-supervisord.sh
COPY docker/monolith/certbot-init.sh /usr/local/bin/certbot-init.sh
COPY docker/monolith/certbot-renew.sh /usr/local/bin/certbot-renew.sh
COPY docker/monolith/certbot-renew-once.sh /usr/local/bin/certbot-renew-once.sh
COPY docker/monolith/sync-letsencrypt-certs.sh /usr/local/bin/sync-letsencrypt-certs.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/init-postgres.sh \
    /usr/local/bin/minio-init.sh /usr/local/bin/start-api.sh /usr/local/bin/generate-ssl-cert.sh \
    /usr/local/bin/ssl-env.sh /usr/local/bin/ssl-ip-fallback.sh \
    /usr/local/bin/configure-nginx.sh /usr/local/bin/configure-supervisord.sh \
    /usr/local/bin/certbot-init.sh /usr/local/bin/certbot-renew.sh /usr/local/bin/certbot-renew-once.sh \
    /usr/local/bin/sync-letsencrypt-certs.sh \
    && mkdir -p /var/log/supervisor /data/minio /app/api /usr/share/nginx/html /etc/nginx/certs /var/www/certbot \
    && install -d -o postgres -g postgres /var/lib/postgresql/data

COPY --from=api-build /app/api/build/libs/*.jar /app/api/app.jar
COPY --from=ui-build /app/build/dist/browser/ /usr/share/nginx/html/

EXPOSE 80 443

HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=20 \
  CMD curl -sf http://127.0.0.1/api/v1/config/client || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
