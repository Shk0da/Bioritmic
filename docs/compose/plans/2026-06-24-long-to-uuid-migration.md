# Long to UUID Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all user-related `Long` IDs with `java.util.UUID` across the entire codebase (backend + frontend + tests).

**Architecture:** Add a Liquibase migration to convert the `users.id` column from `BIGINT` to `UUID`, update all foreign key columns accordingly. Backend domain classes, repositories, controllers, services, and models switch from `Long` to `UUID`. Frontend models switch from `number` to `string`.

**Tech Stack:** Kotlin 2.4, Spring Boot 4.0.5 (WebFlux), R2DBC PostgreSQL, Liquibase, Angular 17, TypeScript

## Global Constraints

- UUID format: `java.util.UUID` (backend), `string` (frontend), `UUID` type in PostgreSQL
- All existing tests must pass after migration
- Database migration must be non-destructive (data preserved)
- API responses change: `id` fields become UUID strings like `"550e8400-e29b-41d4-a716-446655440000"`
- No breaking changes to external consumers (API version bump not required)

---

## File Map

### Backend — Domain Classes (Long → UUID)
| File | Change |
|------|--------|
| `domain/User.kt` | `id: Long?` → `id: UUID?` |
| `domain/Auth.kt` | `userId: Long?` → `userId: UUID?` |
| `domain/GisData.kt` | `userId: Long?` → `userId: UUID?` |
| `domain/GisUser.kt` | `id: Long?` → `id: UUID?` |
| `domain/UserMail.kt` | `fromUserId/toUserId: Long?` → `UUID?` |
| `domain/UserBlock.kt` | `userId/otherUserId: Long?` → `UUID?` |
| `domain/Bookmark.kt` | `userId/otherUserId: Long?` → `UUID?` |
| `domain/Meeting.kt` | `userId/otherUserId: Long?` → `UUID?` |
| `domain/UserPhoto.kt` | `userId: Long?` → `UUID?` |
| `domain/UserSettings.kt` | `userId: Long?` → `UUID?` |
| `domain/UserRole.kt` | `userId: Long?` → `UUID?` |
| `domain/UserPushToken.kt` | stays Long (device token ID, not user) |
| `domain/UserPromptAnswer.kt` | `userId: Long?` → `UUID?` |
| `domain/Story.kt` | `userId: Long?` → `UUID?` |
| `domain/StoryView.kt` | `storyId/viewerId: Long?` → `UUID?` |
| `domain/ProfileBoost.kt` | stays Long (boost record ID) |
| `domain/Subscription.kt` | stays Long (subscription record ID) |
| `domain/Report.kt` | stays Long (report record ID) |
| `domain/Ban.kt` | stays Long (ban record ID) |

### Backend — Repositories
All repositories that use `Long` for user IDs need updating:
- `UserRepository`, `AuthRepository`, `GisDataRepository`, `GisUserRepository`
- `MailboxRepository`, `UserBlockRepository`, `BookmarkRepository`, `MeetingsRepository`
- `UserPhotoRepository`, `UserSettingsRepository`, `UserRoleRepository`
- `UserPushTokenRepository`, `UserPromptAnswerRepository`
- `StoryRepository`, `StoryViewRepository`, `ProfileBoostRepository`
- `SubscriptionRepository`, `ReportBanRepository`
- `InterestRepository` (UserInterest part)

### Backend — Controllers
- `users/UserController.kt` — `PathVariable id: Long` → `UUID`
- `AdminController.kt` — `PathVariable userId: Long` → `UUID`
- `meetings/MeetingsController.kt` — `PathVariable userId: Long` → `UUID`
- `mailbox/MailboxController.kt` — `PathVariable userId: Long` → `UUID`
- `bookmarks/BookmarkController.kt` — `PathVariable userId: Long` → `UUID`
- `UserPhotosController.kt` — `PathVariable id: Long` → `UUID`
- `StoryController.kt` — `PathVariable id: Long` → `UUID`
- `BiorhythmController.kt` — `PathVariable userId: Long` → `UUID`
- `BoostController.kt`, `ReportController.kt`, `SubscriptionController.kt`

### Backend — Services
All 15+ service classes with Long userId parameters

### Backend — Models/DTOs
- `UserInfo.kt` — `id: Long?` → `id: UUID?`
- `UserMailModel.kt` — `from/to: Long?` → `UUID?`
- `UserMeeting.kt` — `userId: Long?` → `UUID?`
- `UserBookmark.kt` — `userId: Long?` → `UUID?`
- `UserPhotoModel.kt` — `id: Long?` stays Long (photo record ID)

### Frontend — Models
- `user.model.ts` — `id?: number` → `id?: string`
- `api-models.ts` — all `number` IDs → `string`

### Frontend — Services & Components
- All services that use number IDs in API calls
- All components with router navigation using IDs

### Tests
- `api/src/test/kotlin/` — all test files
- `ui/e2e/` — all E2E test files

---

## Task 1: Database Migration

**Files:**
- Create: `api/src/main/resources/db-migrations/v1/0021-convert-user-ids-to-uuid.xml`

**Steps:**

- [ ] **Step 1: Create Liquibase migration**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <changeSet id="0021" author="uuid-migration">
        <comment>Convert user IDs from BIGINT to UUID</comment>

        <!-- Create extension for UUID generation -->
        <sql>CREATE EXTENSION IF NOT EXISTS "uuid-ossp";</sql>

        <!-- Add UUID columns alongside existing Long columns -->
        <sql>ALTER TABLE users ADD COLUMN uuid_id UUID DEFAULT uuid_generate_v4();</sql>
        <sql>ALTER TABLE gis_data ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE user_settings ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE authorizations ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE user_blocks ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE user_blocks ADD COLUMN uuid_other_user_id UUID;</sql>
        <sql>ALTER TABLE mailbox ADD COLUMN uuid_from_user_id UUID;</sql>
        <sql>ALTER TABLE mailbox ADD COLUMN uuid_to_user_id UUID;</sql>
        <sql>ALTER TABLE bookmarks ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE bookmarks ADD COLUMN uuid_other_user_id UUID;</sql>
        <sql>ALTER TABLE meetings ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE meetings ADD COLUMN uuid_other_user_id UUID;</sql>
        <sql>ALTER TABLE user_photos ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE user_roles ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE user_push_tokens ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE user_prompt_answers ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE stories ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE story_views ADD COLUMN uuid_story_id UUID;</sql>
        <sql>ALTER TABLE story_views ADD COLUMN uuid_viewer_id UUID;</sql>
        <sql>ALTER TABLE profile_boosts ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE subscriptions ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE reports ADD COLUMN uuid_reporter_id UUID;</sql>
        <sql>ALTER TABLE reports ADD COLUMN uuid_reported_id UUID;</sql>
        <sql>ALTER TABLE bans ADD COLUMN uuid_user_id UUID;</sql>
        <sql>ALTER TABLE user_interests ADD COLUMN uuid_user_id UUID;</sql>

        <!-- Populate UUID columns from users table -->
        <sql>UPDATE gis_data SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = gis_data.user_id);</sql>
        <sql>UPDATE user_settings SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = user_settings.user_id);</sql>
        <sql>UPDATE authorizations SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = authorizations.user_id);</sql>
        <sql>UPDATE user_blocks SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = user_blocks.user_id);</sql>
        <sql>UPDATE user_blocks SET uuid_other_user_id = (SELECT uuid_id FROM users WHERE users.id = user_blocks.other_user_id);</sql>
        <sql>UPDATE mailbox SET uuid_from_user_id = (SELECT uuid_id FROM users WHERE users.id = mailbox.from_user_id);</sql>
        <sql>UPDATE mailbox SET uuid_to_user_id = (SELECT uuid_id FROM users WHERE users.id = mailbox.to_user_id);</sql>
        <sql>UPDATE bookmarks SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = bookmarks.user_id);</sql>
        <sql>UPDATE bookmarks SET uuid_other_user_id = (SELECT uuid_id FROM users WHERE users.id = bookmarks.other_user_id);</sql>
        <sql>UPDATE meetings SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = meetings.user_id);</sql>
        <sql>UPDATE meetings SET uuid_other_user_id = (SELECT uuid_id FROM users WHERE users.id = meetings.other_user_id);</sql>
        <sql>UPDATE user_photos SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = user_photos.user_id);</sql>
        <sql>UPDATE user_roles SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = user_roles.user_id);</sql>
        <sql>UPDATE user_push_tokens SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = user_push_tokens.user_id);</sql>
        <sql>UPDATE user_prompt_answers SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = user_prompt_answers.user_id);</sql>
        <sql>UPDATE stories SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = stories.user_id);</sql>
        <sql>UPDATE story_views SET uuid_story_id = (SELECT uuid_id FROM stories WHERE stories.id = story_views.story_id);</sql>
        <sql>UPDATE story_views SET uuid_viewer_id = (SELECT uuid_id FROM users WHERE users.id = story_views.viewer_id);</sql>
        <sql>UPDATE profile_boosts SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = profile_boosts.user_id);</sql>
        <sql>UPDATE subscriptions SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = subscriptions.user_id);</sql>
        <sql>UPDATE reports SET uuid_reporter_id = (SELECT uuid_id FROM users WHERE users.id = reports.reporter_id);</sql>
        <sql>UPDATE reports SET uuid_reported_id = (SELECT uuid_id FROM users WHERE users.id = reports.reported_id);</sql>
        <sql>UPDATE bans SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = bans.user_id);</sql>
        <sql>UPDATE user_interests SET uuid_user_id = (SELECT uuid_id FROM users WHERE users.id = user_interests.user_id);</sql>

        <!-- Drop old columns and rename UUID columns -->
        <sql>ALTER TABLE users DROP COLUMN id;</sql>
        <sql>ALTER TABLE users RENAME COLUMN uuid_id TO id;</sql>
        <sql>ALTER TABLE users ADD PRIMARY KEY (id);</sql>

        <!-- Repeat for all tables: drop old, rename uuid, add FK -->
        <sql>ALTER TABLE gis_data DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE gis_data RENAME COLUMN uuid_user_id TO user_id;</sql>
        <sql>ALTER TABLE gis_data ADD CONSTRAINT fk_gis_data_user FOREIGN KEY (user_id) REFERENCES users(id);</sql>

        <sql>ALTER TABLE user_settings DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE user_settings RENAME COLUMN uuid_user_id TO user_id;</sql>
        <sql>ALTER TABLE user_settings ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id);</sql>

        <sql>ALTER TABLE authorizations DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE authorizations RENAME COLUMN uuid_user_id TO user_id;</sql>
        <sql>ALTER TABLE authorizations ADD CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES users(id);</sql>

        <sql>ALTER TABLE user_blocks DROP COLUMN user_id, DROP COLUMN other_user_id;</sql>
        <sql>ALTER TABLE user_blocks RENAME COLUMN uuid_user_id TO user_id;</sql>
        <sql>ALTER TABLE user_blocks RENAME COLUMN uuid_other_user_id TO other_user_id;</sql>

        <sql>ALTER TABLE mailbox DROP COLUMN from_user_id, DROP COLUMN to_user_id;</sql>
        <sql>ALTER TABLE mailbox RENAME COLUMN uuid_from_user_id TO from_user_id;</sql>
        <sql>ALTER TABLE mailbox RENAME COLUMN uuid_to_user_id TO to_user_id;</sql>

        <sql>ALTER TABLE bookmarks DROP COLUMN user_id, DROP COLUMN other_user_id;</sql>
        <sql>ALTER TABLE bookmarks RENAME COLUMN uuid_user_id TO user_id;</sql>
        <sql>ALTER TABLE bookmarks RENAME COLUMN uuid_other_user_id TO other_user_id;</sql>

        <sql>ALTER TABLE meetings DROP COLUMN user_id, DROP COLUMN other_user_id;</sql>
        <sql>ALTER TABLE meetings RENAME COLUMN uuid_user_id TO user_id;</sql>
        <sql>ALTER TABLE meetings RENAME COLUMN uuid_other_user_id TO other_user_id;</sql>

        <sql>ALTER TABLE user_photos DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE user_photos RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE user_roles DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE user_roles RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE user_push_tokens DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE user_push_tokens RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE user_prompt_answers DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE user_prompt_answers RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE stories DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE stories RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE story_views DROP COLUMN story_id, DROP COLUMN viewer_id;</sql>
        <sql>ALTER TABLE story_views RENAME COLUMN uuid_story_id TO story_id;</sql>
        <sql>ALTER TABLE story_views RENAME COLUMN uuid_viewer_id TO viewer_id;</sql>

        <sql>ALTER TABLE profile_boosts DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE profile_boosts RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE subscriptions DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE subscriptions RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE reports DROP COLUMN reporter_id, DROP COLUMN reported_id;</sql>
        <sql>ALTER TABLE reports RENAME COLUMN uuid_reporter_id TO reporter_id;</sql>
        <sql>ALTER TABLE reports RENAME COLUMN uuid_reported_id TO reported_id;</sql>

        <sql>ALTER TABLE bans DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE bans RENAME COLUMN uuid_user_id TO user_id;</sql>

        <sql>ALTER TABLE user_interests DROP COLUMN user_id;</sql>
        <sql>ALTER TABLE user_interests RENAME COLUMN uuid_user_id TO user_id;</sql>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Register migration in changelog.xml**

Add after line 27 (before `0020-add-performance-indexes.xml`):
```xml
<include file="v1/0021-convert-user-ids-to-uuid.xml" relativeToChangelogFile="true"/>
```

- [ ] **Step 3: Verify migration compiles**

Run: `./gradlew :api:compileKotlin`
Expected: BUILD SUCCESSFUL

---

## Task 2: Backend Domain Classes

**Files:** All files in `api/src/main/kotlin/.../domain/`

**For each domain class with Long user IDs, replace `Long?` with `UUID?`:**

- [ ] **Step 1: Update User.kt**

```kotlin
// Change:
var id: Long? = null
// To:
var id: UUID? = null
```

Add `import java.util.UUID` at top.

- [ ] **Step 2: Update Auth.kt**

```kotlin
var userId: Long? = null  →  var userId: UUID? = null
```

- [ ] **Step 3: Update GisData.kt, GisUser.kt**

Same pattern: `Long?` → `UUID?` for userId fields.

- [ ] **Step 4: Update UserMail.kt**

```kotlin
var fromUserId: Long? = null  →  var fromUserId: UUID? = null
var toUserId: Long? = null    →  var toUserId: UUID? = null
```

- [ ] **Step 5: Update UserBlock.kt, Bookmark.kt, Meeting.kt**

All `userId: Long?` and `otherUserId: Long?` → `UUID?`

- [ ] **Step 6: Update UserPhoto.kt, UserSettings.kt, UserRole.kt**

`userId: Long?` → `UUID?`

- [ ] **Step 7: Update UserPromptAnswer.kt, Story.kt, StoryView.kt**

`userId: Long?` → `UUID?`, `storyId/viewerId: Long?` → `UUID?`

- [ ] **Step 8: Update Subscription.kt, ProfileBoost.kt, Report.kt, Ban.kt**

`userId: Long?` → `UUID?` (these entities have their own Long `id` for record ID — keep those Long)

- [ ] **Step 9: Run compilation check**

Run: `./gradlew :api:compileKotlin`
Expected: compilation errors in repositories/services/controllers (expected — they still use Long)

---

## Task 3: Backend Repositories

**For each repository, change Long parameters to UUID in query methods:**

- [ ] **Step 1: Update UserRepository.kt**

```kotlin
interface UserRepository : CoroutineCrudRepository<User, UUID> {
    suspend fun setVerified(userId: UUID, verified: Boolean)
    suspend fun updateLastActiveAt(userId: UUID, lastActiveAt: java.sql.Timestamp)
    // ... all Long → UUID
}
```

- [ ] **Step 2: Update AuthRepository.kt**

```kotlin
interface AuthRepository : CoroutineCrudRepository<Auth, Long> {
    suspend fun findByUserId(userId: UUID): Auth?
    suspend fun findByUserIdAndRefreshToken(userId: UUID, refreshToken: String): Auth?
    suspend fun deleteByUserId(userId: UUID)
}
```

Note: `Auth.id` stays Long (record ID), but `Auth.userId` is now UUID.

- [ ] **Step 3: Update remaining repositories**

Apply same pattern to: GisDataRepository, GisUserRepository, MailboxRepository, UserBlockRepository, BookmarkRepository, MeetingsRepository, UserPhotoRepository, UserSettingsRepository, UserRoleRepository, UserPushTokenRepository, UserPromptAnswerRepository, StoryRepository, StoryViewRepository, ProfileBoostRepository, SubscriptionRepository, ReportBanRepository, InterestRepository

- [ ] **Step 4: Run compilation check**

Run: `./gradlew :api:compileKotlin`

---

## Task 4: Backend Models/DTOs

- [ ] **Step 1: Update UserInfo.kt**

```kotlin
val id: UUID? = null  // was Long?
```

Update `of()` companion methods to use UUID.

- [ ] **Step 2: Update UserMailModel.kt, UserMeeting.kt, UserBookmark.kt**

All `from/to/userId` fields: `Long?` → `UUID?`

- [ ] **Step 3: Update UserModel.kt if it has ID fields**

- [ ] **Step 4: Run compilation check**

---

## Task 5: Backend Services

- [ ] **Step 1: Update UserService.kt**

All method signatures: `userId: Long` → `userId: UUID`

- [ ] **Step 2: Update AuthService.kt, MailboxService.kt, MeetingsService.kt**

Same pattern.

- [ ] **Step 3: Update BookmarksService.kt, BoostService.kt, StoryService.kt**

Same pattern. Note: `BoostService.getBoostedUserIds(userIds: Set<Long>)` → `Set<UUID>`

- [ ] **Step 4: Update ReportService.kt, InterestService.kt, PromptService.kt**

Same pattern.

- [ ] **Step 5: Update SubscriptionService.kt, PushNotificationService.kt**

`ConcurrentHashMap<Long, ...>` → `ConcurrentHashMap<UUID, ...>`

- [ ] **Step 6: Update S3Service.kt, EmailService.kt**

Check for any Long userId usage.

- [ ] **Step 7: Run compilation check**

---

## Task 6: Backend Controllers

- [ ] **Step 1: Update UserController.kt**

```kotlin
suspend fun user(@PathVariable id: UUID): UserInfo
suspend fun blockUser(@PathVariable id: UUID): UserInfo
// etc.
```

- [ ] **Step 2: Update AdminController.kt**

```kotlin
suspend fun banUser(@PathVariable userId: UUID): Map<String, Any>
// etc.
```

- [ ] **Step 3: Update MeetingsController.kt, MailboxController.kt**

Same pattern.

- [ ] **Step 4: Update BookmarkController.kt, BiorhythmController.kt**

Same pattern.

- [ ] **Step 5: Update UserPhotosController.kt, StoryController.kt**

Same pattern.

- [ ] **Step 6: Update BoostController.kt, ReportController.kt, SubscriptionController.kt**

Same pattern.

- [ ] **Step 7: Update SecurityUtils.kt**

`getUserId()` must return UUID instead of Long.

- [ ] **Step 8: Run full compilation**

Run: `./gradlew :api:compileKotlin`
Expected: BUILD SUCCESSFUL

---

## Task 7: Update Test Data Migrations

- [ ] **Step 1: Update 9998-test-users.xml**

Replace hardcoded Long IDs with UUID strings. Use `uuid_generate_v4()` or fixed UUIDs for test data.

- [ ] **Step 2: Update 9999-develop-data.xml**

Same — replace Long IDs with UUIDs.

---

## Task 8: Backend Tests

- [ ] **Step 1: Update ApiApplicationTests.kt**

If it references Long IDs, update to UUID.

- [ ] **Step 2: Update BlackBoxApiTest.kt**

All `aliceId`, `bobId`, `charlieId` change from Long to UUID. Registration returns UUID. All assertions update.

- [ ] **Step 3: Update remaining test files**

All test files in `api/src/test/kotlin/` that reference Long user IDs.

- [ ] **Step 4: Run tests**

Run: `./gradlew :api:test`
Expected: BUILD SUCCESSFUL

---

## Task 9: Frontend Models

- [ ] **Step 1: Update user.model.ts**

```typescript
id?: string;      // was number
userId: string;   // was number
```

- [ ] **Step 2: Update api-models.ts**

Same pattern — all `number` IDs → `string`.

- [ ] **Step 3: Run lint**

Run: `cd ui && npm run lint`

---

## Task 10: Frontend Services & Components

- [ ] **Step 1: Update auth.service.ts**

`getCurrentUserId()` returns string, cookie stores string.

- [ ] **Step 2: Update user.service.ts**

All methods with `userId: number` → `userId: string`.

- [ ] **Step 3: Update remaining services**

AdminService, MailboxService, MeetingsService, BookmarksService, BoostService, etc.

- [ ] **Step 4: Update components with router navigation**

Any component using `router.navigate(['/user', id])` where id was number.

- [ ] **Step 5: Update E2E test helpers**

`e2e/helpers.js` — `getCurrentUserId()` returns string.

- [ ] **Step 6: Update all E2E test files**

All `.test.js` files in `e2e/`.

- [ ] **Step 7: Run frontend tests**

Run: `cd ui && npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 0 failures

- [ ] **Step 8: Run frontend build**

Run: `cd ui && npm run build`
Expected: BUILD SUCCESSFUL

---

## Task 11: Final Verification

- [ ] **Step 1: Full backend test suite**

Run: `./gradlew :api:test`
Expected: BUILD SUCCESSFUL

- [ ] **Step 2: Full frontend test suite**

Run: `cd ui && npm test -- --watch=false --browsers=ChromeHeadless`
Expected: 0 failures

- [ ] **Step 3: Production build**

Run: `./gradlew build`
Expected: BUILD SUCCESSFUL
