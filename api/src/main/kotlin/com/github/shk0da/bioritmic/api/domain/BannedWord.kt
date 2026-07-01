package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp

@Table(name = "banned_words")
class BannedWord {

    @Id
    var id: Long? = null

    @Column("word")
    var word: String? = null

    @Column("created_at")
    var createdAt: Timestamp? = null
}
