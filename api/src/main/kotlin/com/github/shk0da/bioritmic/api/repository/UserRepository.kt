package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.domain.User
import org.springframework.data.repository.reactive.ReactiveCrudRepository

interface UserRepository : ReactiveCrudRepository<User?, Long?> 