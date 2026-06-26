# Bioritmic

Biorhythm-based dating app (Kotlin/Spring Boot + Angular).

## Quick start (Docker — one command)

Runs **PostgreSQL, MinIO, mail server, API, and UI** in containers:

```bat
start-docker.bat
```

Linux / macOS:

```bash
chmod +x start-docker.sh
./start-docker.sh
```

Or directly:

```bash
cp .env.example .env    # optional: change MAIL_PASSWORD
docker compose up --build -d
```

Open **http://localhost:4200** — the UI proxies `/api/` to the backend.

| Service | URL |
|---------|-----|
| App (UI + API proxy) | http://localhost:4200 |
| Swagger | http://localhost:4200/swagger-ui.html |
| PostgreSQL | localhost:5432 |
| MinIO console | http://localhost:9341 |
| SMTP | localhost:587 |

Stop: `docker compose down`

## Quick start (Windows, local dev without Docker for API/UI)

```bat
copy .env.example .env
start.bat
```

Runs infrastructure in Docker; API and UI on the host.

## Quick start (manual, host processes)

```bash
cp .env.example .env
docker compose up -d postgres minio mail
./scripts/init-mail.sh        # or .\scripts\init-mail.ps1 on Windows
./gradlew :api:bootRun -Dspring-boot.run.profiles=develop
cd ui && npm install && npm start
```

## Mail server

Outgoing mail uses **docker-mailserver** — domain **`bioritmic.ru`**, sender **`noreply@bioritmic.ru`**.

### Production DNS (`bioritmic.ru`)

Configure at your DNS host and VPS provider:

| Record | Value |
|--------|-------|
| **A** | `mail.bioritmic.ru` → server public IP |
| **MX** | `@` → `mail.bioritmic.ru` |
| **SPF** (TXT) | `v=spf1 mx a ip4:YOUR_IP ~all` |
| **DKIM** (TXT) | `docker compose exec mail setup config dkim domain bioritmic.ru` then add printed key |
| **PTR** | reverse DNS: IP → `mail.bioritmic.ru` (at hosting provider) |

Without SPF/DKIM/PTR, mail may be rejected or marked as spam by Gmail and similar providers.

Full details: [AGENTS.md](AGENTS.md) (Development Setup → Mail Server).
