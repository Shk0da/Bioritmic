package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.Interest
import com.github.shk0da.bioritmic.api.repository.InterestRepository
import com.github.shk0da.bioritmic.api.repository.UserInterestRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class InterestService(
    private val interestRepository: InterestRepository,
    private val userInterestRepository: UserInterestRepository
) {

    private val log = LoggerFactory.getLogger(InterestService::class.java)

    @Transactional(readOnly = true)
    suspend fun getAllInterests(): List<Interest> {
        return interestRepository.findAllActive()
    }

    @Transactional(readOnly = true)
    suspend fun getInterestsByCategory(category: String): List<Interest> {
        return interestRepository.findAllByCategory(category)
    }

    @Transactional(readOnly = true)
    suspend fun getUserInterests(userId: UUID): List<Interest> {
        return userInterestRepository.findInterestsByUserId(userId)
    }

    @Transactional
    suspend fun setUserInterests(userId: UUID, interestIds: List<Long>): List<Interest> {
        userInterestRepository.deleteAllByUserId(userId)

        if (interestIds.isEmpty()) {
            return emptyList()
        }

        val interests = interestRepository.findAllByIds(interestIds)
        interests.forEach { interest ->
            val userInterest = com.github.shk0da.bioritmic.api.domain.UserInterest()
            userInterest.userId = userId
            userInterest.interestId = interest.id!!
            userInterestRepository.save(userInterest)
        }

        log.debug("Set {} interests for userId: {}", interests.size, userId)
        return interests
    }

    @Transactional
    suspend fun addInterestToUser(userId: UUID, interestId: Long): Interest? {
        val existing = userInterestRepository.findByUserIdAndInterestId(userId, interestId)
        if (existing != null) {
            return interestRepository.findById(interestId)
        }

        val interest = interestRepository.findById(interestId)
        if (interest != null) {
            val userInterest = com.github.shk0da.bioritmic.api.domain.UserInterest()
            userInterest.userId = userId
            userInterest.interestId = interestId
            userInterestRepository.save(userInterest)
        }

        return interest
    }

    @Transactional
    suspend fun removeInterestFromUser(userId: UUID, interestId: Long) {
        userInterestRepository.deleteByUserIdAndInterestId(userId, interestId)
    }
}
