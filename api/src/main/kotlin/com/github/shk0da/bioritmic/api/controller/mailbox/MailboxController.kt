package com.github.shk0da.bioritmic.api.controller.mailbox

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import com.github.shk0da.bioritmic.api.model.PageableRequest.Companion.of
import com.github.shk0da.bioritmic.api.model.user.UserMailModel
import com.github.shk0da.bioritmic.api.service.MailboxService
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springdoc.core.annotations.ParameterObject
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.http.codec.multipart.FilePart
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestPart
import org.springframework.web.bind.annotation.RestController
import java.security.Principal
import java.util.UUID
import javax.validation.Valid

@Validated
@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/mailbox")
class MailboxController(val mailboxService: MailboxService) {

    @GetMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun mailbox(@ParameterObject pageable: Pageable): List<UserMailModel> {
        val userId = getUserId()
        return mailboxService.getUserMailbox(userId, of(pageable)).map { mailboxService.toModel(it) }
    }

    @PostMapping(produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun mailbox(@RequestBody @Valid userMailModel: UserMailModel, principal: Principal): List<UserMailModel> {
        val userId = getUserId(principal)
        return mailboxService.sendUserMail(userId, userMailModel)
    }

    @PostMapping(
        value = ["/media"],
        consumes = [MediaType.MULTIPART_FORM_DATA_VALUE],
        produces = [MediaType.APPLICATION_JSON_VALUE]
    )
    suspend fun sendMediaMail(
        @RequestPart("to") toUserId: String,
        @RequestPart("mediaType") mediaType: String,
        @RequestPart("file") file: FilePart,
        @RequestPart("message", required = false) caption: String?
    ): List<UserMailModel> {
        val userId = getUserId()
        val recipientId = try {
            UUID.fromString(toUserId.trim())
        } catch (_: IllegalArgumentException) {
            throw com.github.shk0da.bioritmic.api.exceptions.ApiException(
                com.github.shk0da.bioritmic.api.exceptions.ErrorCode.INVALID_PARAMETER,
                mapOf("to" to "to")
            )
        }
        return mailboxService.sendMediaMail(userId, recipientId, mediaType, file, caption)
    }

    @DeleteMapping(value = ["/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun deleteMailbox(@PathVariable userId: UUID) {
        val currentUserId = getUserId()
        mailboxService.deleteMailboxes(currentUserId, userId)
    }

    @GetMapping(value = ["/conversation/{userId}"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun conversation(@PathVariable userId: UUID): List<UserMailModel> {
        val currentUserId = getUserId()
        return mailboxService.getConversation(currentUserId, userId).map { mailboxService.toModel(it) }
    }

    @GetMapping(value = ["/badge"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun unreadBadge(@RequestParam(defaultValue = "0") since: Long): Map<String, Long> {
        val userId = getUserId()
        return mapOf("count" to mailboxService.countUnreadSenders(userId, since))
    }
}
