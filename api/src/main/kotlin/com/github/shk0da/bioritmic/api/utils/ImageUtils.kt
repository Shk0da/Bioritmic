package com.github.shk0da.bioritmic.api.utils

import org.slf4j.LoggerFactory
import java.awt.Image
import java.awt.image.BufferedImage
import java.io.File
import java.io.IOException
import java.lang.Math.min
import java.nio.file.Files
import javax.imageio.ImageIO

object ImageUtils {

    private val log = LoggerFactory.getLogger(ImageUtils::class.java)

    private val storage = File("storage").absolutePath
    private val usersImageStorage = File("$storage${File.separatorChar}image${File.separatorChar}users").absolutePath

    enum class ImageTag(val width: Int, val height: Int) {
        ORIGINAL(0, 0),
        CROPP_500x500(500, 500),
        CROPP_300x300(300, 300),
        CROPP_250x250(250, 250),
        CROPP_200x200(200, 200),
        CROPP_100x100(100, 100),
    }

    val noImageFile = File("storage/image/no_image.png")

    fun initStorages() {
        val storages = arrayListOf(storage, usersImageStorage)
        storages.forEach {
            val dir = File(it)
            if (!dir.exists()) {
                val dirPath = Files.createDirectories(dir.toPath())
                log.debug("Created directory: {}", dirPath)
            }
        }
    }

    fun getProfileImageUri(userId: Long): String {
        return "/api/v1/user/$userId/photo"
    }

    fun profileImagePath(userId: Long): String {
        return profileImagePath(userId, ImageTag.CROPP_250x250)
    }

    fun profileImagePath(userId: Long, tag: ImageTag): String {
        return "$usersImageStorage${File.separatorChar}$userId-${tag.name}.jpg"
    }

    fun cropAndSaveUserImage(userId: Long, originalFile: File, tag: ImageTag) {
        val croppedFile = File(profileImagePath(userId, tag))
        val originalImage = ImageIO.read(originalFile)
        val resized = resizeImage(originalImage, tag.width, tag.height)
        ImageIO.write(resized, "jpg", croppedFile)
    }

    fun deleteUserImages(userId: Long) {
        ImageTag.values().iterator().forEachRemaining {
            val image = File(profileImagePath(userId, it))
            if (image.exists()) {
                image.delete()
                log.debug("Delete image '{}' for userId: {}", image, userId)
            }
        }
    }

    @Throws(IOException::class)
    private fun resizeImage(originalImage: BufferedImage, width: Int, height: Int): BufferedImage {
        val scale = min((width.toDouble() / originalImage.width), (height.toDouble() / originalImage.height))
        val scaledWidth = (originalImage.width * scale).toInt()
        val scaledHeight = (originalImage.height * scale).toInt()
        val resultingImage = originalImage.getScaledInstance(scaledWidth, scaledHeight, Image.SCALE_SMOOTH)
        val outputImage = BufferedImage(scaledWidth, scaledHeight, BufferedImage.TYPE_INT_RGB)
        outputImage.graphics.drawImage(resultingImage, 0, 0, null)
        return outputImage
    }
}