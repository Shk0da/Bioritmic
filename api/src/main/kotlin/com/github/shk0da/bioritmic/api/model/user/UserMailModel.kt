package com.github.shk0da.bioritmic.api.model.user

import com.fasterxml.jackson.annotation.JsonProperty
import com.github.shk0da.bioritmic.api.domain.UserMail
import java.sql.Timestamp
import javax.validation.constraints.NotNull
import javax.validation.constraints.Size

data class UserMailModel(@JsonProperty(access = JsonProperty.Access.READ_ONLY) val id: Long? = null,
                         @JsonProperty(access = JsonProperty.Access.READ_ONLY) var from: Long? = null,
                         @field:NotNull val to: Long? = null,
                         @field:NotNull @field:Size(min = 1, max = 1024) val message: String? = null,
                         @JsonProperty(access = JsonProperty.Access.READ_ONLY) var timestamp: Timestamp? = null) {

    companion object {
        fun of(userMail: UserMail): UserMailModel {
            return UserMailModel(
                    id = userMail.id,
                    from = userMail.fromUserId,
                    to = userMail.toUserId!!,
                    message = userMail.message!!,
                    timestamp = userMail.timestamp
            )
        }
    }
}