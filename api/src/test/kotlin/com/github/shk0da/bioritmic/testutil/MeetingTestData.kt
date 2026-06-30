package com.github.shk0da.bioritmic.testutil

import com.github.shk0da.bioritmic.api.model.user.UserMeeting
import java.sql.Timestamp
import java.util.UUID

fun testMeeting(
    userId: UUID,
    lat: Double = 55.75,
    lon: Double = 37.61,
    distance: Double = 10.0,
    description: String = "Кафе в центре",
    scheduledAt: Timestamp = Timestamp(System.currentTimeMillis() + 86_400_000),
) = UserMeeting(
    userId = userId,
    lat = lat,
    lon = lon,
    distance = distance,
    description = description,
    scheduledAt = scheduledAt,
)
