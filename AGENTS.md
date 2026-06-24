# AGENTS.md — Bioritmic Project

> Instructions for AI coding agents working in this repository.
> Always read this file before making changes. Follow the verification checklist after every code change.

---

## Project Overview

Bioritmic is a biorhythm-based dating app with a Kotlin/Spring Boot reactive backend and Angular 17 frontend. Users create profiles, view biorhythm compatibility, swipe on matches, send meeting requests, and exchange messages. The app includes admin dashboard, user reporting/banning, profile boosting, stories, and push notifications.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin 2.4, Spring Boot 4.0.5 (WebFlux reactive) |
| Database | PostgreSQL 16 (R2DBC + JDBC), Liquibase migrations |
| Cache | Infinispan (embedded) |
| Storage | MinIO (S3-compatible) |
| Auth | Cookie-based tokens, Spring Security WebFlux, OAuth2 |
| Frontend | Angular 17 (standalone components, lazy-loaded routes) |
| UI Framework | Bootstrap 5.3 |
| Testing (BE) | JUnit 5, Testcontainers, WebTestClient |
| Testing (FE) | Karma + Jasmine (unit), Selenium 4.45 + Mocha (E2E) |
| Build | Gradle (Kotlin DSL), npm |
| Static Analysis | Detekt (Kotlin), Angular ESLint |

---

## Project Structure

```
Bioritmic/
├── api/                          # Kotlin backend
│   ├── build.gradle.kts
│   └── src/
│       ├── main/kotlin/com/github/shk0da/bioritmic/api/
│       │   ├── ApiApplication.kt
│       │   ├── configuration/     # DataSource, Security, etc.
│       │   ├── constants/         # Profile config constants
│       │   ├── controller/        # REST controllers
│       │   │   ├── ApiRoutes.kt   # API path constants (/api/v1, /api/v2)
│       │   │   ├── AuthController.kt
│       │   │   ├── AdminController.kt
│       │   │   ├── BoostController.kt
│       │   │   ├── ReportController.kt
│       │   │   ├── SubscriptionController.kt
│       │   │   ├── bookmarks/
│       │   │   ├── mailbox/
│       │   │   ├── meetings/
│       │   │   ├── search/
│       │   │   ├── synchronization/
│       │   │   └── users/
│       │   ├── domain/            # Entity classes (User, Meeting, Mail, etc.)
│       │   ├── model/             # DTOs / request-response models
│       │   ├── repository/        # R2DBC repositories
│       │   ├── service/           # Business logic services
│       │   └── utils/
│       ├── main/resources/
│       │   ├── application.yml
│       │   └── db-migrations/     # Liquibase XML migrations (v1/)
│       └── test/kotlin/           # Backend tests
│
├── ui/                           # Angular frontend
│   ├── build.gradle.kts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .mocharc.yml
│   ├── proxy.conf.json           # Dev proxy to backend :8080
│   ├── e2e/                      # Selenium E2E tests
│   │   ├── helpers.js            # Shared utilities (createDriver, registerUser, etc.)
│   │   ├── user-interaction.test.js
│   │   ├── badge-interaction.test.js
│   │   ├── admin-dashboard.test.js
│   │   ├── report-user.test.js
│   │   ├── logout.test.js
│   │   └── profile-boost-admin.test.js
│   └── src/app/
│       ├── core/
│       │   ├── guards/           # auth.guard, admin.guard
│       │   ├── interceptors/     # HTTP interceptor (adds Bearer token)
│       │   ├── models/           # TypeScript interfaces
│       │   └── services/         # AuthService, UserService, AdminService, etc.
│       ├── features/
│       │   ├── auth/             # Login, Registration
│       │   ├── swipe/            # Main swipe card view
│       │   ├── search/           # Search with filters
│       │   ├── profile/          # User profile, edit, boost, admin button
│       │   ├── user-detail/      # View other user's profile + report
│       │   ├── bookmarks/        # Saved users
│       │   ├── mailbox/          # Messaging (list + conversation)
│       │   ├── meetings/         # Meeting requests (accept/decline)
│       │   ├── admin/            # Admin dashboard (stats, users, reports, metrics)
│       │   ├── settings/         # User settings
│       │   └── subscription/     # Premium subscription
│       └── shared/
│           ├── components/       # Reusable UI components
│           └── layout/           # Layout component (sidebar, logout)
│
├── docker-compose.yml            # PostgreSQL 16 + MinIO
└── build.gradle.kts              # Root Gradle build
```

---

## Key Architecture Decisions

### Authentication
- **Token storage**: Cookies (NOT localStorage). Token is `access_token`, refresh is `refresh_token`, user object is `current_user`.
- **HTTP Interceptor**: `core/interceptors/` adds `Authorization: Bearer <token>` to all API requests.
- **Auth guard**: `core/guards/auth.guard.ts` protects all routes except `/auth/*`.
- **Admin guard**: `core/guards/admin.guard.ts` protects `/admin/*` routes.
- **Backend auth**: `AuthController` issues tokens. `UserController.me()` returns current user with roles.

### Role System
- Database table: `user_roles` (migration `0016-create-user-roles.xml`)
- Roles: `ROLE_ADMIN`, `USER`, `BANNED`
- **First registered user automatically gets `ROLE_ADMIN`** (checked in `AuthController.registration()` by user count)
- Admin status is included in `/api/v1/user/me` response via `role` field

### API Conventions
- Base path: `/api/v1/` (defined in `ApiRoutes.kt`)
- All authenticated endpoints require `Authorization: Bearer <token>` header
- Paginated endpoints use `?page=0&size=10` query params
- Reactive endpoints return `Mono<>` or `Flux<>` (Spring WebFlux)

### Frontend Conventions
- Lazy-loaded feature modules via `loadChildren` in `app.routes.ts`
- Services use `HttpClient` with `/api/v1` prefix
- Auth state managed via `BehaviorSubject` in `AuthService`
- Badge polling: `setInterval` every 30s, compares timestamps in localStorage

---

## Development Setup

### Prerequisites
- Java 21
- Node.js 20.11+
- Docker (for PostgreSQL + MinIO)

### Start Infrastructure
```bash
docker-compose up -d
```
This starts:
- PostgreSQL on `localhost:5432` (user: `postgres`, password: `postgres`, db: `bioritmic`)
- MinIO on `localhost:9340` (API) / `localhost:9341` (console)

### Start Backend
```bash
./gradlew :api:bootRun
```
Backend runs on `localhost:8080`. Actuator on `localhost:8081`.

### Start Frontend (Dev)
```bash
cd ui
npm install
npm start
```
Frontend runs on `localhost:4200` with proxy to backend.

### Build All
```bash
./gradlew build
```

---

## Verification Checklist — MANDATORY After Every Code Change

**You MUST run all applicable verification commands before claiming work is complete.**

### 1. Backend Changes (api/)

After modifying any Kotlin file in `api/`:

```bash
# Run all backend tests (uses Testcontainers — requires Docker)
./gradlew :api:test

# Run Detekt static analysis
./gradlew detekt

# Verify the build compiles
./gradlew :api:compileKotlin
```

**What to check:**
- All tests pass (look for `BUILD SUCCESSFUL`)
- No Detekt violations (auto-corrected where possible)
- No compilation errors

**Test infrastructure:** Backend tests use Testcontainers to spin up a real PostgreSQL instance. Docker must be running. Tests extend `ApiApplicationTests` which clears the database and auth cache between tests.

### 2. Frontend Changes (ui/)

After modifying any TypeScript file in `ui/`:

```bash
# Run unit tests
cd ui && npm test -- --watch=false --browsers=EdgeHeadless

# Run lint
cd ui && npm run lint

# Verify build
cd ui && npm run build
```

**What to check:**
- All Karma/Jasmine unit tests pass
- No lint errors
- Production build succeeds

### 3. E2E Test Changes (ui/e2e/)

After modifying or adding E2E tests:

```bash
cd ui && npm run test:e2e
```

**Prerequisites for E2E:**
- Frontend dev server running (`npm start` in `ui/`)
- Backend running (`./gradlew :api:bootRun`)
- Docker running (PostgreSQL + MinIO)
- Microsoft Edge installed (E2E uses Edge headless)

**E2E test helpers** (`e2e/helpers.js`):
- `createDriver()` — creates Edge headless Selenium driver
- `registerUser(driver, user)` — registers a test user
- `loginUser(driver, email, password)` — logs in a test user
- `waitAndClick(driver, locator)` — waits for element and clicks
- `waitAndType(driver, locator, text)` — waits for element and types
- `waitForUrlContains(driver, fragment)` — waits for URL change
- `isElementPresent(driver, locator)` — checks element existence
- `sendApiRequest(method, path, body, token)` — direct API calls

### 4. Database Migration Changes

If you add or modify Liquibase migrations in `api/src/main/resources/db-migrations/`:

```bash
# Tests automatically apply migrations via Testcontainers
./gradlew :api:test

# Manual verification: start the app and check logs for Liquibase execution
./gradlew :api:bootRun
```

**Naming convention**: `v1/NNNN-description.xml` (e.g., `0020-add-performance-indexes.xml`).
Always add new migrations with the next sequential number. Never modify existing migration files.

### 5. Quick Verification (Any Change)

For a fast sanity check after any change:

```bash
# Backend compile + tests
./gradlew :api:test

# Frontend build
cd ui && npm run build
```

---

## Common Tasks

### Adding a New API Endpoint

1. Add route constant to `ApiRoutes.kt` (or use existing version)
2. Create controller method in appropriate `controller/` subdirectory
3. Add service method if business logic is needed
4. Add repository method if database access is needed
5. Add Liquibase migration if schema changes are needed
6. Write backend tests extending `ApiApplicationTests`
7. Run `./gradlew :api:test`

### Adding a New Frontend Feature

1. Create feature module in `ui/src/app/features/<name>/`
2. Add route to `app.routes.ts` with `loadChildren` and `authGuard`
3. Create component, service, and routes
4. Add unit tests (`.spec.ts`)
5. Add E2E tests in `ui/e2e/` if user-facing
6. Run `npm test` and `npm run build`

### Adding a New Service (Frontend)

1. Create `ui/src/app/core/services/<name>.service.ts`
2. Create `ui/src/app/core/services/<name>.service.spec.ts` with unit tests
3. Inject via constructor in components that need it

### Modifying Database Schema

1. Create new Liquibase migration XML in `api/src/main/resources/db-migrations/v1/`
2. Use next sequential number (check existing files)
3. Reference in `changelog.xml` if not auto-included
4. Tests use Testcontainers so migrations run automatically

---

## Code Style

### Kotlin (Backend)
- Follow existing code patterns in the same directory
- Use `companion object` for constants
- Reactive types: `Mono<>` for single values, `Flux<>` for streams
- Package structure: `controller/`, `service/`, `repository/`, `domain/`, `model/`
- Detekt enforces style — run `./gradlew detekt` to check

### TypeScript (Frontend)
- Strict mode enabled (`tsconfig.json`: `strict: true`)
- Standalone components (Angular 17 pattern)
- Services use `@Injectable({ providedIn: 'root' })`
- Models in `core/models/`
- Guards in `core/guards/`
- Interceptors in `core/interceptors/`

### Testing Patterns

**Backend test base class:**
```kotlin
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(classes = [DataSourceTestConfiguration::class, S3TestConfiguration::class, ApiApplication::class])
@ActiveProfiles("test", "pg-embedded")
class MyTest : ApiApplicationTests() {
    // webTestClient is injected
    // Database is cleared between tests
}
```

**Frontend unit test pattern:**
```typescript
describe('MyService', () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService, provideHttpClientTesting()]
    });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should do something', () => {
    // Arrange, Act, Assert
  });
});
```

**E2E test pattern:**
```javascript
const { createDriver, quitDriver, registerUser, waitAndClick } = require('./helpers');

describe('Feature', function () {
  let driver;

  before(async function () {
    driver = await createDriver();
  });

  after(async function () {
    await quitDriver(driver);
  });

  it('should do something', async function () {
    // Use helpers for common operations
  });
});
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:4200` | Frontend URL (for E2E tests) |
| `API_URL` | `http://localhost:8080` | Backend URL (for E2E tests) |

---

## Important Notes

- **Do NOT use `localStorage` for auth tokens** — this project uses cookies via `CookieService`. Any code that reads/writes tokens to localStorage is incorrect.
- **Do NOT modify existing Liquibase migration files** — always create new ones.
- **Do NOT skip tests** — the verification checklist is mandatory. Run tests before claiming completion.
- **Detekt runs with auto-correct** — it will fix some style issues automatically.
- **E2E tests use MicrosoftEdge** — not Chrome. The `createDriver()` helper is configured for Edge headless.
- **`premium.free-for-all: true`** in `application.yml` means all users currently get Pro features without payment.
- **First user is admin** — this is checked at registration time by counting existing users.
- **Badge system** polls every 30s and uses localStorage timestamps to determine unread counts.

---

## File Quick Reference

| Purpose | Path |
|---------|------|
| Backend entry point | `api/src/main/kotlin/.../ApiApplication.kt` |
| API routes | `api/src/main/kotlin/.../controller/ApiRoutes.kt` |
| Auth controller | `api/src/main/kotlin/.../controller/AuthController.kt` |
| User controller | `api/src/main/kotlin/.../controller/users/UserController.kt` |
| Admin controller | `api/src/main/kotlin/.../controller/AdminController.kt` |
| Database config | `api/src/main/resources/application.yml` |
| Migrations | `api/src/main/resources/db-migrations/v1/` |
| Test base class | `api/src/test/kotlin/.../ApiApplicationTests.kt` |
| Test DB config | `api/src/test/kotlin/.../configuration/DataSourceTestConfiguration.kt` |
| Frontend routes | `ui/src/app/app.routes.ts` |
| Auth service | `ui/src/app/core/services/auth.service.ts` |
| Auth guard | `ui/src/app/core/guards/auth.guard.ts` |
| HTTP interceptor | `ui/src/app/core/interceptors/` |
| E2E helpers | `ui/e2e/helpers.js` |
| E2E tests | `ui/e2e/*.test.js` |
| Unit tests (FE) | `ui/src/app/**/*.spec.ts` |
| Docker setup | `docker-compose.yml` |
