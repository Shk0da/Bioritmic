package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.repository.UserRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class UserVerificationService(
    private val userRepository: UserRepository,
) {

    suspend fun requireVerified(userId: UUID) {
        val user = userRepository.findById(userId)
            ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        if (!user.isVerified) {
            throw ApiException(ErrorCode.USER_NOT_VERIFIED)
        }
    }
}
