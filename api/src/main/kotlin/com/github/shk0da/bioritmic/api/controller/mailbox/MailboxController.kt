package com.github.shk0da.bioritmic.api.controller.mailbox

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.service.MailboxService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import reactor.core.publisher.Flux
import reactor.core.publisher.Mono
import java.security.Principal
import javax.validation.Valid

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/mailbox")
class MailboxController(val mailboxService: MailboxService) {

    // GET /mailbox <- Mails
    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun mailbox(pageable: Pageable): Flux<UserMailModel> {
        val userId = getUserId()
        return mailboxService.getUserMailbox(userId, of(pageable)).map { UserMailModel.of(it) }
    }

    // POST /me/mailbox -> Mail
    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    fun mailbox(@Valid @RequestBody userMailModel: UserMailModel, principal: Principal): Flux<UserMailModel> {
        val userId = getUserId(principal)
        return mailboxService.sendUserMail(userId, userMailModel).map { UserMailModel.of(it) }
    }

    // DELETE /me/mailbox -> Mail/Mails
    @DeleteMapping(value = ["/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun deleteMailbox(@PathVariable userId: Long): Mono<Void> {
        val currentUserId = getUserId()
        return mailboxService.deleteMailboxes(currentUserId, userId)
    }
}