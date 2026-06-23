package com.github.shk0da.bioritmic.api.model.user

data class UserPhotoModel(
    val id: Long? = null,
    val photoOrder: Int = 0,
    val contentType: String? = null,
    val photoBytes: ByteArray? = null,
    val s3Key: String? = null
)
