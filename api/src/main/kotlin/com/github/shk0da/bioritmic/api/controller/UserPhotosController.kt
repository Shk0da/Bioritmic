package com.github.shk0da.bioritmic.api.controller

import com.github.shk0da.bioritmic.api.model.user.UserPhotoModel
import com.github.shk0da.bioritmic.api.repository.UserPhotoRepository
import com.github.shk0da.bioritmic.api.utils.SecurityUtils.getUserId
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/user")
class UserPhotosController(
    private val userPhotoRepository: UserPhotoRepository
) {

    @GetMapping(value = ["/{id}/photos"], produces = [MediaType.APPLICATION_JSON_VALUE])
    suspend fun getUserPhotos(@PathVariable id: UUID): List<UserPhotoModel> {
        val photos = userPhotoRepository.findAllByUserId(id)
        return photos.map { photo ->
            UserPhotoModel(
                id = photo.id,
                photoOrder = photo.photoOrder,
                contentType = photo.contentType,
                photoBytes = null,
                s3Key = photo.s3Key
            )
        }
    }
}
