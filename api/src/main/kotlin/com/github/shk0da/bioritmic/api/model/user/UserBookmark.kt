package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.Bookmark
import com.github.shk0da.bioritmic.api.model.BasicPresentation
import java.util.UUID
import javax.validation.constraints.NotNull

data class UserBookmark(
    @field:NotNull val userId: UUID?,
    @JsonProperty(access = JsonProperty.Access.READ_ONLY) val timestamp: Long?
) : BasicPresentation {

    companion object {
        fun of(bookmark: Bookmark): UserBookmark {
            return UserBookmark(bookmark.otherUserId!!, bookmark.timestamp?.time)
        }
    }

    @JsonIgnore
    fun isFilledInput(): Boolean {
        return null != userId
    }
}
