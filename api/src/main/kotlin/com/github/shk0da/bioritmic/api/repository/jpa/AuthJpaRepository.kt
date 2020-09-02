package com.github.shk0da.bioritmic.api.repository.jpa

import com.github.shk0da.bioritmic.api.domain.Auth
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AuthJpaRepository : JpaRepository<Auth, Long> {
    fun findByUserId(userId: Long): Auth?
}