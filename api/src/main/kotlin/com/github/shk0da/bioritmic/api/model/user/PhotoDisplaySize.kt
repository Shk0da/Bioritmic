package com.github.shk0da.bioritmic.api.model.user

import com.github.shk0da.bioritmic.api.utils.ImageUtils.ImageTag

enum class PhotoDisplaySize {
    THUMB,
    CARD;

    fun preferredTags(): List<ImageTag> = when (this) {
        THUMB -> listOf(ImageTag.CROPP_250x250)
        CARD -> listOf(ImageTag.CROPP_500x500, ImageTag.ORIGINAL, ImageTag.CROPP_250x250)
    }

    companion object {
        fun fromQuery(value: String?): PhotoDisplaySize = when (value?.lowercase()) {
            "card", "large" -> CARD
            else -> THUMB
        }
    }
}
