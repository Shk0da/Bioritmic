package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.repository.MailboxRepository
import com.github.shk0da.bioritmic.api.repository.UserBlockRepository
import kotlinx.coroutines.flow.toList
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.domain.Sort.by
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class MailboxService(
    val userService: UserService,
    val mailboxRepository: MailboxRepository,
    val userBlockRepository: UserBlockRepository
) {

    private val defaultPageable = PageableRequest(1, 10, by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    suspend fun getUserMailbox(userId: Long, pageable: Pageable): List<UserMail> {
        return mailboxRepository.findAllMailsByUserId(userId, pageable.pageSize, pageable.offset)
    }

    @Transactional
    suspend fun sendUserMail(userId: Long, userMailModel: UserMailModel): List<UserMail> {
        val user = userService.findUserById(userMailModel.to!!) ?: throw ApiException(ErrorCode.USER_NOT_FOUND)
        val block = userBlockRepository.findByUserIdAndOtherUserId(user.id!!, userId)
        if (null != block) {
            throw ApiException(ErrorCode.USER_IS_BLOCKED)
        }

        userMailModel.from = userId
        val userMail = UserMail.of(userMailModel)
        mailboxRepository.save(userMail)
        return mailboxRepository
            .findAllByFromUserIdAndToUserId(userMail.fromUserId!!, userMail.toUserId!!, defaultPageable)
            .toList()
    }

    @Transactional
    suspend fun deleteMailboxes(currentUserId: Long, userId: Long) {
        mailboxRepository.deleteAllMailByBetweenTwoUserId(currentUserId, userId)
    }

    @Transactional
    suspend fun getConversation(currentUserId: Long, otherUserId: Long): List<UserMail> {
        return mailboxRepository.findConversationBetweenUsers(currentUserId, otherUserId)
    }
}
