package com.github.shk0da.bioritmic.api.utils

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

object CryptoUtils {

    val passwordEncoder: BCryptPasswordEncoder = BCryptPasswordEncoder()

}