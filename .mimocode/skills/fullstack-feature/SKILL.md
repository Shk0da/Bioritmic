---
name: fullstack-feature
description: Implement a full-stack feature in Bioritmic: Liquibase migration, Kotlin domain/repository/service/controller, Angular component/service, build verification. Follow this playbook for any new feature that touches both backend and frontend.
---

# Full-Stack Feature Implementation Playbook

Implements a complete feature end-to-end following Bioritmic's established patterns. Every step has a concrete template and a verification gate.

---

## Prerequisites

- Read `AGENTS.md` before starting (project conventions, verification checklist).
- Confirm the feature scope: what tables/columns change, what API endpoints are added/modified, what UI components are affected.
- Check existing migrations in `api/src/main/resources/db-migrations/v1/` for the next sequential number.

---

## Step 1: Liquibase Migration

**When:** Any schema change (new table, new column, index, data backfill).

**File:** `api/src/main/resources/db-migrations/v1/NNNN-description.xml` (next sequential number).

**Register** in `api/src/main/resources/db-migrations/changelog.xml` by adding an `<include>` line before the `<!-- -->` separator.

### Template — New Table

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <changeSet id="NNNN-1" author="ai">
        <preConditions onFail="MARK_RAN">
            <not><tableExists tableName="TABLE_NAME"/></not>
        </preConditions>
        <createTable tableName="TABLE_NAME">
            <column name="id" type="BIGSERIAL" autoIncrement="true">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="user_id" type="UUID">
                <constraints nullable="false"/>
            </column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>
        <addForeignKeyConstraint
                baseTableName="TABLE_NAME" baseColumnNames="user_id"
                referencedTableName="users" referencedColumnNames="id"/>
        <createIndex tableName="TABLE_NAME" indexName="IDX_TABLE_USER_ID">
            <column name="user_id"/>
        </createIndex>
    </changeSet>

</databaseChangeLog>
```

### Template — Alter Table (add column)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <changeSet id="NNNN-1" author="ai">
        <preConditions onFail="MARK_RAN">
            <not><columnExists tableName="TABLE_NAME" columnName="NEW_COL"/></not>
        </preConditions>
        <addColumn tableName="TABLE_NAME">
            <column name="NEW_COL" type="VARCHAR(255)"/>
        </addColumn>
    </changeSet>

</databaseChangeLog>
```

**Verification:** Run `./gradlew :api:test` — migrations apply via Testcontainers.

---

## Step 2: Kotlin Domain Entity

**When:** New table or new columns that need a data class.

**File:** `api/src/main/kotlin/com/github/shk0da/bioritmic/api/domain/EntityName.kt`

### Template

```kotlin
package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable
import java.sql.Timestamp

@Table(name = "TABLE_NAME")
class EntityName : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: Long = 0

    @Column("created_at")
    var createdAt: Timestamp? = null

    // companion object for constants (role enums, status codes, etc.)
    companion object {
        const val STATUS_ACTIVE = "ACTIVE"
        const val STATUS_DELETED = "DELETED"
    }
}
```

**Conventions:**
- Use `Long` for IDs (UUID-based tables use `String`).
- Use `Timestamp?` for nullable timestamps.
- `companion object` for domain constants (not enums — Kotlin R2DBC works better with string constants).
- Keep the class mutable (`var`) — matches existing project style.

---

## Step 3: Kotlin Repository

**When:** Always, alongside the domain entity.

**File:** `api/src/main/kotlin/com/github/shk0da/bioritmic/api/repository/EntityNameRepository.kt`

### Template

```kotlin
package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import com.github.shk0da.bioritmic.api.domain.EntityName
import org.springframework.data.r2dbc.repository.Query
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = transactionManager)
interface EntityNameRepository : CoroutineCrudRepository<EntityName, Long> {

    @Query("SELECT * FROM TABLE_NAME WHERE user_id = :userId")
    suspend fun findAllByUserId(userId: Long): List<EntityName>

    @Query("DELETE FROM TABLE_NAME WHERE user_id = :userId")
    suspend fun deleteByUserId(userId: Long): Int
}
```

**Conventions:**
- Always extend `CoroutineCrudRepository<T, ID>`.
- Always use `@Repository` + `@Transactional(transactionManager = transactionManager)`.
- Use `DataSourceConfiguration.Companion.transactionManager` (not the string name).
- Custom queries use `@Query` with R2DBC-compatible SQL (no joins with `IN` subqueries if avoidable).
- Return `List<T>` for queries, `Int` for deletes/updates.

---

## Step 4: Kotlin Service

**When:** Business logic, validation, or orchestration beyond simple CRUD.

**File:** `api/src/main/kotlin/com/github/shk0da/bioritmic/api/service/EntityNameService.kt`

### Template

```kotlin
package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.EntityName
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode.*
import com.github.shk0da.bioritmic.api.repository.EntityNameRepository
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class EntityNameService(
    private val entityNameRepository: EntityNameRepository
) {
    private val log = LoggerFactory.getLogger(EntityNameService::class.java)

    suspend fun getByUserId(userId: Long): List<EntityName> {
        return entityNameRepository.findAllByUserId(userId)
    }

    suspend fun create(userId: Long, data: EntityName): EntityName {
        data.userId = userId
        return entityNameRepository.save(data)
    }

    suspend fun delete(userId: Long, entityId: Long) {
        val entity = entityNameRepository.findById(entityId)
            ?: throw ApiException(NOT_FOUND, "Entity not found")
        if (entity.userId != userId) {
            throw ApiException(FORBIDDEN, "Cannot delete another user's entity")
        }
        entityNameRepository.deleteById(entityId)
    }
}
```

**Conventions:**
- Log errors with `log.warn(...)`.
- Use `ApiException` with `ErrorCode` constants for business errors.
- Inject repositories, not other services (unless orchestration requires it).
- Use `suspend` functions (reactive R2DBC).
- Ownership checks: always verify `entity.userId == userId` before mutations.

---

## Step 5: Kotlin Controller

**When:** New API endpoint or modified endpoint.

**File:** `api/src/main/kotlin/com/github/shk0da/bioritmic/api/controller/<feature>/EntityNameController.kt`

### Template

```kotlin
package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.EntityNameModel
import com.github.shk0da.bioritmic.api.service.EntityNameService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Mono

@RestController
@RequestMapping(ApiRoutes.API_WITH_VERSION_1)
class EntityNameController(
    private val entityNameService: EntityNameService
) {

    @GetMapping("/entity-name")
    suspend fun getAll(): Mono<ResponseEntity<List<EntityNameModel>>> {
        val userId = getUserId()
        val entities = entityNameService.getByUserId(userId)
        return Mono.just(ResponseEntity.ok(entities.map { it.toModel() }))
    }

    @PostMapping("/entity-name")
    suspend fun create(@RequestBody body: CreateEntityRequest): Mono<ResponseEntity<EntityNameModel>> {
        val userId = getUserId()
        val entity = entityNameService.create(userId, body.toDomain())
        return Mono.just(ResponseEntity.status(HttpStatus.CREATED).body(entity.toModel()))
    }

    @DeleteMapping("/entity-name/{id}")
    suspend fun delete(@PathVariable id: Long): Mono<ResponseEntity<Void>> {
        val userId = getUserId()
        entityNameService.delete(userId, id)
        return Mono.just(ResponseEntity.noContent().build())
    }
}
```

**Conventions:**
- Use `ApiRoutes.API_WITH_VERSION_1` (or `VERSION_1` with `ApiRoutes.API_PATH`).
- Use `Mono<ResponseEntity<T>>` return type.
- Get current user ID via `SecurityUtils.getUserId()`.
- Use `@Validated` + `@Valid` on request bodies when input validation is needed.
- Return `ResponseEntity` with proper HTTP status codes (200, 201, 204).

### Request/Response DTO

```kotlin
package com.github.shk0da.bioritmic.api.model

data class CreateEntityRequest(
    val field: String
)

data class EntityNameModel(
    val id: Long,
    val field: String
)
```

---

## Step 6: Angular Component

**When:** New UI screen or modified UI element.

**File:** `ui/src/app/features/<feature>/<name>/<name>.component.ts`

### Checklist
- Standalone component (`@Component({ standalone: true, ... })`).
- Lazy-loaded in `app.routes.ts` via `loadChildren`.
- Service in `ui/src/app/core/services/<name>.service.ts`.
- Models in `ui/src/app/core/models/<name>.model.ts`.
- Unit test in `<name>.component.spec.ts`.

### Route registration (`app.routes.ts`)

```typescript
{
  path: 'feature-name',
  loadChildren: () => import('./features/<feature>/<name>/<name>.routes')
    .then(m => m.routes),
  canActivate: [authGuard]
}
```

---

## Step 7: Build Verification (MANDATORY)

After every file change, run the applicable verification:

```bash
# Backend
./gradlew :api:compileKotlin 2>&1 | tail -30

# Frontend
cd ui && npx ng build 2>&1 | tail -30

# Full backend tests (when ready)
./gradlew :api:test

# Frontend lint
cd ui && npm run lint
```

**Error recovery:**
- Compilation errors: read the `e:` lines, fix imports/types, re-compile.
- Angular build errors: check for missing imports, template type mismatches.
- Never claim completion without a successful build.

---

## Step 8: Changelog Registration (if migration added)

Edit `api/src/main/resources/db-migrations/changelog.xml`:

```xml
    <include file="v1/NNNN-description.xml" relativeToChangelogFile="true"/>
```

Add before the `<!-- -->` separator (before `Seeding` section).

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Migration | `v1/NNNN-kebab-case.xml` | `v1/0048-create-user-likes.xml` |
| Domain | `PascalCase.kt` (singular) | `UserRole.kt` |
| Repository | `<Domain>Repository.kt` | `UserRoleRepository.kt` |
| Service | `<Feature>Service.kt` | `BookmarksService.kt` |
| Controller | `<Feature>Controller.kt` | `SwipeController.kt` |
| Angular component | `<name>.component.ts` | `swipe.component.ts` |
| Angular service | `<name>.service.ts` | `user.service.ts` |
| Angular model | `<name>.model.ts` | `user.model.ts` |
| Unit test | `<name>.spec.ts` | `user.service.spec.ts` |

---

## Common Pitfalls

1. **Forgetting changelog.xml** — migration won't run. Always register new migrations.
2. **Wrong transactionManager** — use `DataSourceConfiguration.Companion.transactionManager`, not a string.
3. **Missing ownership check** — service methods that mutate user data must verify `entity.userId == currentUserId`.
4. **Sync vs suspend** — all repository/service methods interacting with R2DBC must be `suspend`.
5. **Angular standalone** — every new component must have `standalone: true` in `@Component`.
6. **Lazy loading** — new routes must use `loadChildren` (not `loadComponent` for feature modules).
7. **Testcontainers** — backend tests use Testcontainers with Docker. Ensure Docker is running before `./gradlew :api:test`.
