package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.io.Serializable

@Table(name = "user_interests")
class UserInterest : Serializable {

    @Id
    var id: Long? = null

    @Column("user_id")
    var userId: Long = 0

    @Column("interest_id")
    var interestId: Long = 0
}
