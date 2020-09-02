package com.github.shk0da.bioritmic.api.repository.jpa

import com.github.shk0da.bioritmic.api.domain.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
interface UserJpaRepository : JpaRepository<User, Long> {

    @Transactional(readOnly = true)
    fun existsByEmail(email: String): Boolean

    @Transactional(readOnly = true)
    fun findByEmail(email: String): User?
}