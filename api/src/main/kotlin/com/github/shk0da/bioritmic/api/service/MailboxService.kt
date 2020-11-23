package com.github.shk0da.bioritmic.api.service

import com.github.shk0da.bioritmic.api.domain.UserMail
import com.github.shk0da.bioritmic.api.exceptions.ApiException
import com.github.shk0da.bioritmic.api.exceptions.ErrorCode
import com.github.shk0da.bioritmic.api.model.PageableRequest
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.repository.r2dbc.MailboxR2dbcRepository
import com.github.shk0da.bioritmic.api.repository.r2dbc.UserBlockR2dbcRepository
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.domain.Sort.by
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import reactor.core.publisher.Mono.just

@Service
class MailboxService(val userService: UserService,
                     val mailboxR2dbcRepository: MailboxR2dbcRepository,
                     val userBlockR2dbcRepository: UserBlockR2dbcRepository) {

    private val defaultPageable = PageableRequest(1, 10, by(Sort.Direction.DESC, "timestamp"))

    @Transactional
    fun getUserMailbox(userId: Long, pageable: Pageable): Flux<UserMail> {
        return mailboxR2dbcRepository.findLatestMailsByUserId(userId, pageable.pageSize, pageable.offset)
    }

    @Transactional
    fun sendUserMail(userId: Long, userMailModel: UserMailModel): Flux<UserMail> {
        return userService.findUserById(userMailModel.to!!)
                .switchIfEmpty(Mono.error(ApiException(ErrorCode.USER_NOT_FOUND)))
                .map {user ->
                    userBlockR2dbcRepository
                            .findByUserIdAndOtherUserId(user.id!!, userId)
                            .map {block ->
                                if (null != block) {
                                    throw ApiException(ErrorCode.USER_IS_BLOCKED)
                                }
                                user
                            }.switchIfEmpty(just(user))
                }
                .flatMap { it }
                .map { to ->
                    userMailModel.from = userId
                    val userMail = UserMail.of(userMailModel)
                    mailboxR2dbcRepository.save(userMail)
                            .map {
                                mailboxR2dbcRepository.findAllByFromUserIdAndToUserId(
                                        userMail.fromUserId!!, userMail.toUserId!!, defaultPageable
                                )
                            }.flatMapMany { it }
                }.flatMapMany { it }
    }

    @Transactional
    fun deleteMailboxes(currentUserId: Long, userId: Long): Mono<Void> {
        return mailboxR2dbcRepository.deleteAllMailByBetweenTwoUserId(currentUserId, userId)
    }
}