package com.github.shk0da.bioritmic.api.model.user

enum class UserStatusPosition {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
    BOTTOM_CENTER;

    companion object {
        fun parse(value: String?): UserStatusPosition? =
            entries.firstOrNull { it.name.equals(value?.trim(), ignoreCase = true) }
    }
}
