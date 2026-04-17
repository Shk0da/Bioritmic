package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.repository.MailboxJpaRepository
import com.github.shk0da.bioritmic.api.repository.UserBlockJpaRepository
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.domain.Sort.by
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class MailboxService(
    val userService: UserService,
    val mailboxJpaRepository: MailboxJpaRepository,
    val userBlockJpaRepository: UserBlockJpaRepository
) {

    private val defaultPageable = PageableRequest(1, 10, by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun getUserMailbox(userId: Long, pageable: Pageable): List<UserMail> {
        return mailboxJpaRepository.findLatestMailsByUserId(userId, pageable.pageSize, pageable.offset)
    }

    @Transactional
    suspend fun sendUserMail(userId: Long, userMailModel: UserMailModel): List<UserMail> {
        val user = userService.findUserById(userMailModel.to!!) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val block = userBlockJpaRepository.findByUserIdAndOtherUserId(user.id!!, userId)
        if (null != block) {
            throw ApiException(ErrorCode.USER_IS_BLOCKED)
        }

        userMailModel.from = userId
        val userMail = UserMail.of(userMailModel)
        mailboxJpaRepository.save(userMail)
        return mailboxJpaRepository.findAllByFromUserIdAndToUserId(userMail.fromUserId!!, userMail.toUserId!!, defaultPageable)
    }

    @Transactional
    suspend fun deleteMailboxes(currentUserId: Long, userId: Long) {
        mailboxJpaRepository.deleteAllMailByBetweenTwoUserId(currentUserId, userId)
    }
}
