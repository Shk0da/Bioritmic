# Bioritmic

Biorhythm-based dating app (Kotlin/Spring Boot + Angular).

## Quick start (Windows)

```bat
copy .env.example .env
start.bat
```

Starts PostgreSQL, MinIO, **self-hosted mail server**, backend (`:8080`), and frontend (`:4200`).

## Quick start (manual)

```bash
cp .env.example .env          # set MAIL_PASSWORD if needed (default: changeme)
docker compose up -d
./scripts/init-mail.sh        # or .\scripts\init-mail.ps1 on Windows
./gradlew :api:bootRun -Dspring-boot.run.profiles=develop
cd ui && npm install && npm start
```

## Mail server

Outgoing mail (password recovery, admin reset) uses **docker-mailserver** in Docker — domain **`bioritmic.ru`**, sender **`noreply@bioritmic.ru`**, SMTP **`localhost:587`** in dev.

| Service | URL / port |
|---------|------------|
| Frontend | http://localhost:4200 |
| Backend | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| MinIO console | http://localhost:9341 |
| SMTP | localhost:587 |

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
