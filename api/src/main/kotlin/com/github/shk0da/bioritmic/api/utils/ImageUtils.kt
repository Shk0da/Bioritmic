package com.github.shk0da.bioritmic.api.utils

import org.slf4j.LoggerFactory
import java.awt.Image
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.lang.Math.min
import javax.imageio.ImageIO

object ImageUtils {

    private val log = LoggerFactory.getLogger(ImageUtils::class.java)

    private val defaultImageBytes: ByteArray by lazy {
        javaClass.classLoader.getResourceAsStream("images/no_image.png")?.readBytes()
            ?: throw IllegalStateException("Default image not found")
    }

    @Suppress("MagicNumber")
    enum class ImageTag(val width: Int, val height: Int) {
        ORIGINAL(0, 0),
        CROPP_500x500(500, 500),
        CROPP_300x300(300, 300),
        CROPP_250x250(250, 250),
        CROPP_200x200(200, 200),
        CROPP_100x100(100, 100),
    }

    fun defaultNoImage(): ByteArray = defaultImageBytes

    fun cropImageBytes(inputBytes: ByteArray, tag: ImageTag): ByteArray {
        if (tag == ImageTag.ORIGINAL) return inputBytes

        val originalImage = ImageIO.read(ByteArrayInputStream(inputBytes))
            ?: throw IOException("Unable to read image")
        val resized = resizeImage(originalImage, tag.width, tag.height)
        val outputStream = ByteArrayOutputStream()
        ImageIO.write(resized, "jpg", outputStream)
        return outputStream.toByteArray()
    }

    fun getProfileImageUri(userId: Long): String {
        return "/api/v1/user/$userId/photo"
    }

    fun s3KeyForPhoto(userId: Long, tag: ImageTag): String {
        return "profile/$userId/${tag.name.lowercase()}.jpg"
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
