package com.github.shk0da.bioritmic.api.utils

import com.drew.imaging.ImageMetadataReader
import com.drew.metadata.exif.ExifIFD0Directory
import org.slf4j.LoggerFactory
import java.awt.Image
import java.awt.geom.AffineTransform
import java.awt.image.AffineTransformOp
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.lang.Math.min
import java.util.UUID
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
        val normalizedImage = normalizeOrientation(inputBytes, originalImage)
        val resized = resizeImage(normalizedImage, tag.width, tag.height)
        val outputStream = ByteArrayOutputStream()
        ImageIO.write(resized, "jpg", outputStream)
        return outputStream.toByteArray()
    }

    fun getProfileImageUri(userId: UUID): String {
        return "/api/v1/user/$userId/photo"
    }

    fun s3KeyForPhoto(userId: UUID, tag: ImageTag): String {
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

    private fun normalizeOrientation(inputBytes: ByteArray, image: BufferedImage): BufferedImage {
        val orientation = readExifOrientation(inputBytes)
        if (orientation == 1) return image

        val transform = AffineTransform()
        var newWidth = image.width
        var newHeight = image.height

        when (orientation) {
            2 -> {
                transform.scale(-1.0, 1.0)
                transform.translate(-image.width.toDouble(), 0.0)
            }
            3 -> {
                transform.translate(image.width.toDouble(), image.height.toDouble())
                transform.rotate(Math.PI)
            }
            4 -> {
                transform.scale(1.0, -1.0)
                transform.translate(0.0, -image.height.toDouble())
            }
            5 -> {
                transform.rotate(Math.PI / 2)
                transform.scale(1.0, -1.0)
                newWidth = image.height
                newHeight = image.width
            }
            6 -> {
                transform.translate(image.height.toDouble(), 0.0)
                transform.rotate(Math.PI / 2)
                newWidth = image.height
                newHeight = image.width
            }
            7 -> {
                transform.translate(image.height.toDouble(), 0.0)
                transform.rotate(Math.PI / 2)
                transform.scale(-1.0, 1.0)
                newWidth = image.height
                newHeight = image.width
            }
            8 -> {
                transform.translate(0.0, image.width.toDouble())
                transform.rotate(-Math.PI / 2)
                newWidth = image.height
                newHeight = image.width
            }
            else -> return image
        }

        val destinationImage = BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB)
        val operation = AffineTransformOp(transform, AffineTransformOp.TYPE_BILINEAR)
        operation.filter(image, destinationImage)
        return destinationImage
    }

    private fun readExifOrientation(inputBytes: ByteArray): Int {
        return runCatching {
            val metadata = ImageMetadataReader.readMetadata(ByteArrayInputStream(inputBytes))
            metadata.getFirstDirectoryOfType(ExifIFD0Directory::class.java)
                ?.getInt(ExifIFD0Directory.TAG_ORIENTATION) ?: 1
        }.getOrElse {
            log.debug("Failed to read EXIF orientation: {}", it.message)
            1
        }
    }
}
