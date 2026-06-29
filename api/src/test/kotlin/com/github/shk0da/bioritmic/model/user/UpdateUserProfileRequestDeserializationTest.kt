package com.github.shk0da.bioritmic.model.user

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.model.user.UpdateUserProfileRequest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class UpdateUserProfileRequestDeserializationTest {

    private val mapper = jacksonObjectMapper()

    @Test
    fun deserializesGenderFromPatchBody() {
        val request = mapper.readValue<UpdateUserProfileRequest>("""{"gender":"WOMAN"}""")
        assertEquals(Gender.WOMAN, request.gender)
    }

    @Test
    fun deserializesFullProfileUpdate() {
        val request = mapper.readValue<UpdateUserProfileRequest>(
            """
            {
              "name": "Anna",
              "birthday": "1990-01-01",
              "gender": "WOMAN",
              "bio": "Hello"
            }
            """.trimIndent()
        )
        assertEquals("Anna", request.name)
        assertEquals(Gender.WOMAN, request.gender)
        assertEquals("Hello", request.bio)
    }
}
