package com.github.shk0da.bioritmic.controller

import com.github.shk0da.bioritmic.ApiApplicationTests
import com.github.shk0da.bioritmic.api.controller.ApiRoutes.Companion.API_WITH_VERSION_1
import com.github.shk0da.bioritmic.api.model.AuthorizationModel
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import com.github.shk0da.bioritmic.api.model.user.UserInfo
import com.github.shk0da.bioritmic.domain.UserModel
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.BodyInserters
import java.util.UUID

class BlackBoxApiTest : ApiApplicationTests() {

    private lateinit var aliceToken: String
    private var aliceId: UUID = UUID(0, 0)

    private lateinit var bobToken: String
    private var bobId: UUID = UUID(0, 0)

    private lateinit var charlieToken: String
    private var charlieId: UUID = UUID(0, 0)

    @BeforeEach
    fun setup() {
        val uid = UUID.randomUUID().toString().substring(0, 8)

        // Register Alice (WOMAN)
        aliceId = registerAndLogin("alice_${uid}@gmail.com", "Alice", "1990-03-15", "WOMAN")
        aliceToken = getToken("alice_${uid}@gmail.com")

        // Register Bob (MAN)
        bobId = registerAndLogin("bob_${uid}@gmail.com", "Bob", "1988-07-22", "MAN")
        bobToken = getToken("bob_${uid}@gmail.com")

        // Register Charlie (MAN)
        charlieId = registerAndLogin("charlie_${uid}@gmail.com", "Charlie", "1995-01-10", "MAN")
        charlieToken = getToken("charlie_${uid}@gmail.com")

        // Save GIS data for all users
        val gis = mapOf("lat" to 55.7558, "lon" to 37.6173)
        for (token in listOf(aliceToken, bobToken, charlieToken)) {
            webTestClient.post()
                .uri("$API_WITH_VERSION_1/user/me/gis")
                .header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(gis))
                .accept(MediaType.APPLICATION_JSON)
                .exchange()
                .expectStatus().isOk
        }
    }

    private fun registerAndLogin(email: String, name: String, birthday: String, gender: String): UUID {
        var userId = UUID(0, 0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserModel(name = name, email = email, password = "Test12345", birthday = birthday, gender = gender)))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id").value { id: Any -> userId = UUID.fromString(id as String) }

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = email, password = "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk

        return userId
    }

    private fun getToken(email: String): String {
        var token = ""
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = email, password = "Test12345")))
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.accessToken").value { t: Any -> token = t as String }

        return "Bearer $token"
    }

    private fun auth(token: String): (HttpHeaders) -> Unit = { headers ->
        headers.set(HttpHeaders.AUTHORIZATION, token)
        headers.accept = listOf(MediaType.APPLICATION_JSON)
    }

    // ===== AUTH =====

    @Test
    fun `register new user returns 201`() {
        val email = "newuser_${UUID.randomUUID().toString().substring(0, 8)}@gmail.com"
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserModel(name = "New", email = email, password = "Test12345", birthday = "1995-01-01")))
            .exchange()
            .expectStatus().isCreated
    }

    @Test
    fun `register duplicate email returns 400`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserModel(name = "Dup", email = "alice_dup@gmail.com", password = "Test12345", birthday = "1990-01-01")))
            .exchange()
            .expectStatus().isCreated

        webTestClient.post()
            .uri("$API_WITH_VERSION_1/registration")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(UserModel(name = "Dup2", email = "alice_dup@gmail.com", password = "Test12345", birthday = "1990-01-01")))
            .exchange()
            .expectStatus().is4xxClientError
    }

    @Test
    fun `login with correct credentials returns token`() {
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/authorization")
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(AuthorizationModel(email = "bob_${UUID.randomUUID().toString().substring(0, 8)}@gmail.com", password = "wrong")))
            .exchange()
            .expectStatus().is4xxClientError
    }

    @Test
    fun `get user me returns current user`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Alice")
    }

    @Test
    fun `access without token returns 401`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me")
            .accept(MediaType.APPLICATION_JSON)
            .exchange()
            .expectStatus().isUnauthorized
    }

    // ===== USER =====

    @Test
    fun `get user by id returns user info`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$bobId")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Bob")
    }

    @Test
    fun `get non-existent user returns 404`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/00000000-0000-0000-0000-000000000099")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().is4xxClientError
    }

    @Test
    fun `update user profile`() {
        webTestClient.patch()
            .uri("$API_WITH_VERSION_1/user/me")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mapOf("name" to "Alice Updated")))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.name").isEqualTo("Alice Updated")
    }

    // ===== SETTINGS =====

    @Test
    fun `get and update settings`() {
        // Update settings
        val settings = mapOf("gender" to "MAN", "ageMin" to 18, "ageMax" to 50, "distance" to 30.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/settings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(settings))
            .exchange()
            .expectStatus().isOk

        // Read back
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/settings")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    // ===== MEETINGS =====

    @Test
    fun `create meeting between alice and bob`() {
        val meeting = UserMeeting(userId = bobId, lat = 55.75, lon = 37.61, distance = 10.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `bob sees meeting from alice`() {
        // Alice sends meeting to Bob
        val meeting = UserMeeting(userId = bobId, lat = 55.75, lon = 37.61, distance = 10.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk

        // Bob sees the meeting
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").value<Int> { len ->
                assert(len > 0) { "Bob should see the meeting from Alice" }
            }
    }

    @Test
    fun `alice does not see her own sent meeting`() {
        // Alice sends meeting to Bob
        val meeting = UserMeeting(userId = bobId, lat = 55.75, lon = 37.61, distance = 10.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk

        // Alice should NOT see her own sent meeting
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)
    }

    @Test
    fun `accept meeting changes status`() {
        // Alice sends to Bob
        val meeting = UserMeeting(userId = bobId, lat = 55.75, lon = 37.61, distance = 10.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk

        // Bob accepts
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$aliceId/accept")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk

        // Verify status is ACCEPTED
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].status").isEqualTo("ACCEPTED")
    }

    @Test
    fun `decline meeting hides it from list`() {
        // Alice sends to Bob
        val meeting = UserMeeting(userId = bobId, lat = 55.75, lon = 37.61, distance = 10.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk

        // Bob declines
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$aliceId/decline")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk

        // Declined meeting should not appear
        val bobMeetings: List<UserMeeting> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult().responseBody ?: emptyList()

        assert(bobMeetings.none { it.userId == aliceId }) { "Declined meeting should not appear" }
    }

    @Test
    fun `self meeting is filtered out`() {
        val meeting = UserMeeting(userId = aliceId, lat = 55.75, lon = 37.61, distance = 10.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(0)
    }

    // ===== MAILBOX =====

    @Test
    fun `send and receive message`() {
        val mail = UserMailModel(to = bobId, message = "Hello Bob!")
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mail))
            .exchange()
            .expectStatus().isOk

        // Bob sees conversation
        val messages: List<UserMailModel> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$aliceId")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMailModel::class.java)
            .returnResult().responseBody ?: emptyList()

        assert(messages.isNotEmpty()) { "Bob should see the message" }
    }

    @Test
    fun `send message to blocked user returns 412`() {
        // Bob blocks Alice
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/$aliceId/block")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk

        // Alice tries to message Bob
        val mail = UserMailModel(to = bobId, message = "Hello!")
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mail))
            .exchange()
            .expectStatus().isEqualTo(412)
    }

    // ===== BLOCKS =====

    @Test
    fun `block and unblock user`() {
        // Block
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/$bobId/block")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk

        // Check blocked list
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/blocked?page=0&size=10")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").value<Int> { len ->
                assert(len > 0) { "Bob should be in blocked list" }
            }

        // Unblock
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/$bobId/unblock")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `is blocked by check`() {
        // Bob blocks Alice
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/$aliceId/block")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk

        // Alice checks if Bob blocked her
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/$bobId/is-blocked-by")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk

        // Clean up
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/$aliceId/unblock")
            .headers(auth(bobToken))
            .exchange()
    }

    // ===== BOOKMARKS =====

    @Test
    fun `add and remove bookmark`() {
        // Add
        val bookmark = mapOf("userId" to bobId)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(bookmark)))
            .exchange()
            .expectStatus().isOk

        // Check list
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/bookmarks?page=0&size=10")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").value<Int> { len ->
                assert(len > 0) { "Bob should be in bookmarks" }
            }

        // Remove
        webTestClient.delete()
            .uri("$API_WITH_VERSION_1/bookmarks/$bobId")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `match detection when mutual bookmarks`() {
        // Alice bookmarks Bob
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(mapOf("userId" to bobId))))
            .exchange()
            .expectStatus().isOk

        // Bob bookmarks Alice
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .headers(auth(bobToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(mapOf("userId" to aliceId))))
            .exchange()
            .expectStatus().isOk

        // Check match
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/bookmarks/matches/$bobId")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    // ===== SEARCH =====

    @Test
    fun `search returns results`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/search")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    @Test
    fun `search with filter`() {
        val filter = mapOf("gender" to "MAN", "ageMin" to 18, "ageMax" to 100, "distance" to 100.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/search")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(filter))
            .exchange()
            .expectStatus().isOk
    }

    // ===== ADMIN =====

    @Test
    fun `non-admin cannot access admin panel`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/dashboard")
            .headers(auth(charlieToken))
            .exchange()
            .expectStatus().isEqualTo(403)
    }

    @Test
    fun `non-admin cannot access admin metrics`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/admin/metrics")
            .headers(auth(charlieToken))
            .exchange()
            .expectStatus().isEqualTo(403)
    }

    // ===== BIORHYTHM =====

    @Test
    fun `get biorhythm detail`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/biorhythm/$bobId/detail")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    // ===== GIS =====

    @Test
    fun `save and get gis data`() {
        val gis = mapOf("lat" to 55.7558, "lon" to 37.6173)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(gis))
            .exchange()
            .expectStatus().isOk

        webTestClient.get()
            .uri("$API_WITH_VERSION_1/user/me/gis")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    // ===== SUBSCRIPTION =====

    @Test
    fun `get current subscription`() {
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/subscription/current")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
    }

    // ===== CROSS-USER INTERACTIONS =====

    @Test
    fun `full flow alice meets bob`() {
        // 1. Alice bookmarks Bob
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(mapOf("userId" to bobId))))
            .exchange()
            .expectStatus().isOk

        // 2. Bob bookmarks Alice (mutual = match)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/bookmarks")
            .headers(auth(bobToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(mapOf("userId" to aliceId))))
            .exchange()
            .expectStatus().isOk

        // 3. Alice sends meeting to Bob
        val meeting = UserMeeting(userId = bobId, lat = 55.75, lon = 37.61, distance = 5.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk

        // 4. Bob sends message to Alice
        val mail = UserMailModel(to = aliceId, message = "Hey, let's meet!")
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .headers(auth(bobToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mail))
            .exchange()
            .expectStatus().isOk

        // 5. Alice accepts the meeting
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$aliceId/accept")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk

        // 6. Verify meeting is ACCEPTED
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$[0].status").isEqualTo("ACCEPTED")

        // 7. Alice sees conversation with Bob
        val messages: List<UserMailModel> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/mailbox/conversation/$bobId")
            .headers(auth(aliceToken))
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMailModel::class.java)
            .returnResult().responseBody ?: emptyList()

        assert(messages.isNotEmpty()) { "Alice should see Bob's message" }
    }

    @Test
    fun `block prevents messaging and meeting visibility`() {
        // Alice sends meeting to Bob
        val meeting = UserMeeting(userId = bobId, lat = 55.75, lon = 37.61, distance = 10.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meeting)))
            .exchange()
            .expectStatus().isOk

        // Bob blocks Alice
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/$aliceId/block")
            .headers(auth(bobToken))
            .exchange()
            .expectStatus().isOk

        // Alice cannot message Bob
        val mail = UserMailModel(to = bobId, message = "test")
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/mailbox")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(mail))
            .exchange()
            .expectStatus().isEqualTo(412)

        // Unblock for cleanup
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/user/$aliceId/unblock")
            .headers(auth(bobToken))
            .exchange()
    }

    @Test
    fun `three users interactions`() {
        // Alice sends meeting to Charlie
        val meetingAtoC = UserMeeting(userId = charlieId, lat = 55.75, lon = 37.61, distance = 3.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(aliceToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meetingAtoC)))
            .exchange()
            .expectStatus().isOk

        // Bob sends meeting to Charlie
        val meetingBtoC = UserMeeting(userId = charlieId, lat = 55.76, lon = 37.62, distance = 7.0)
        webTestClient.post()
            .uri("$API_WITH_VERSION_1/meetings")
            .headers(auth(bobToken))
            .contentType(MediaType.APPLICATION_JSON)
            .body(BodyInserters.fromValue(listOf(meetingBtoC)))
            .exchange()
            .expectStatus().isOk

        // Charlie sees both meetings
        val charlieMeetings: List<UserMeeting> = webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(charlieToken))
            .exchange()
            .expectStatus().isOk
            .expectBodyList(UserMeeting::class.java)
            .returnResult().responseBody ?: emptyList()

        assert(charlieMeetings.size == 2) { "Charlie should see 2 meetings, saw ${charlieMeetings.size}" }

        // Charlie accepts Alice, declines Bob
        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$aliceId/accept")
            .headers(auth(charlieToken))
            .exchange()
            .expectStatus().isOk

        webTestClient.put()
            .uri("$API_WITH_VERSION_1/meetings/$bobId/decline")
            .headers(auth(charlieToken))
            .exchange()
            .expectStatus().isOk

        // Charlie now sees only 1 meeting (declined hidden)
        webTestClient.get()
            .uri("$API_WITH_VERSION_1/meetings?page=0&size=10")
            .headers(auth(charlieToken))
            .exchange()
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.length()").isEqualTo(1)
            .jsonPath("$[0].status").isEqualTo("ACCEPTED")
    }
}
