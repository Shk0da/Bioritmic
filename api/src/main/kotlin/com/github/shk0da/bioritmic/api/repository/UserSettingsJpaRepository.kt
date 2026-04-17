package com.github.shk0da.bioritmic.api.repository

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.jpaTransactionManager
import com.github.shk0da.bioritmic.api.domain.UserSettings
import org.springframework.data.jpa.repository.JpaRepository

import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(transactionManager = jpaTransactionManager)
interface UserSettingsJpaRepository : JpaRepository<UserSettings, Long>
