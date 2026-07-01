package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.repository.BanRepository
import com.github.shk0da.bioritmic.api.repository.ReportRepository
import com.github.shk0da.bioritmic.api.repository.UserRoleRepository
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import java.util.UUID

class ReportServiceTest {

    private val reportRepository = Mockito.mock(ReportRepository::class.java)
    private val banRepository = Mockito.mock(BanRepository::class.java)
    private val userRoleRepository = Mockito.mock(UserRoleRepository::class.java)
    private val authService = Mockito.mock(AuthService::class.java)

    private val service = ReportService(
        reportRepository,
        banRepository,
        userRoleRepository,
        authService,
    )

    @Test
    fun `banUser terminates all sessions`() = runBlocking {
        val userId = UUID.randomUUID()

        service.banUser(userId, "test ban")

        Mockito.verify(userRoleRepository).removeRole(userId, com.github.shk0da.bioritmic.api.constants.UserRoleConstants.ROLE_USER)
        Mockito.verify(userRoleRepository).addRole(userId, com.github.shk0da.bioritmic.api.constants.UserRoleConstants.ROLE_BANNED)
        Mockito.verify(authService).deleteAuthByUserId(userId)
        Mockito.verify(banRepository).save(Mockito.any())
    }
}
