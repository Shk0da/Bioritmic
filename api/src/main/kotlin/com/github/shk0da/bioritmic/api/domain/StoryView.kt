package com.github.shk0da.bioritmic.api.domain

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.sql.Timestamp
import java.util.UUID

@Table(name = "story_views")
class StoryView {

    @Id
    var id: Long? = null

    @Column("story_id")
    var storyId: Long? = null

    @Column("viewer_id")
    var viewerId: UUID? = null

    @Column("viewed_at")
    var viewedAt: Timestamp? = null
}
