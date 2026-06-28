package com.github.shk0da.bioritmic

import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SeedPasswordTest {

    private val seedHash = "\$2a\$10\$u8FDeghIngUoihQVztHuh.3LMxESSdbrsTBGrJniDHuDrZwerkSaK"

    @Test
    fun seedUsersPasswordIsDocumented() {
        assertTrue(passwordEncoder.matches("Test123456", seedHash))
    }
}
