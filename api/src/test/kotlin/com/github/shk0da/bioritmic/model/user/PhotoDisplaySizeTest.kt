package com.github.shk0da.bioritmic.api.model.user

import com.github.shk0da.bioritmic.api.utils.ImageUtils.ImageTag
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class PhotoDisplaySizeTest {

    @Test
    fun fromQueryParsesCardAliases() {
        assertEquals(PhotoDisplaySize.CARD, PhotoDisplaySize.fromQuery("card"))
        assertEquals(PhotoDisplaySize.CARD, PhotoDisplaySize.fromQuery("large"))
        assertEquals(PhotoDisplaySize.THUMB, PhotoDisplaySize.fromQuery(null))
        assertEquals(PhotoDisplaySize.THUMB, PhotoDisplaySize.fromQuery("thumb"))
    }

    @Test
    fun cardPrefersLargerVariantsFirst() {
        assertEquals(
            listOf(ImageTag.CROPP_500x500, ImageTag.ORIGINAL, ImageTag.CROPP_250x250),
            PhotoDisplaySize.CARD.preferredTags(),
        )
    }
}
