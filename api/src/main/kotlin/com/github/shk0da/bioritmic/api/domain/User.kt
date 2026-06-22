package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import org.springframework.data.annotation.Id
import org.springframework.data.annotation.Transient
import org.springframework.data.relational.core.mapping.Column
import org.springframework.data.relational.core.mapping.Table
import java.lang.System.currentTimeMillis
import java.sql.Timestamp
import java.util.*
import java.util.concurrent.TimeUnit

@Table(name = "users")
class User {

    @Id
    var id: Long? = null

    @Column("name")
    var name: String? = null

    @Column("email")
    var email: String? = null

    @Column("password")
    var password: String? = null

    @Column("birthday")
    var birthday: Timestamp? = null

    @Column("gender")
    var gender: Short? = null

    @Column("recovery_code")
    var recoveryCode: String? = null

    @Column("recovery_code_expire_time")
    var recoveryCodeExpireTime: Timestamp? = null

    @Column("register_date")
    var registerDate: Timestamp? = null

    @Column("bio")
    var bio: String? = null

    @Column("last_active_at")
    var lastActiveAt: Timestamp? = null

    @Column("is_verified")
    var isVerified: Boolean = false

    @Transient
    var userSettings: UserSettings? = null

    fun getGender(): Gender? {
        if (null == this.gender || Gender.values().size < this.gender!!.toInt()) {
            return null
        }
        return Gender.values()[this.gender!!.toInt()]
    }

    fun setGender(gender: Gender?) {
        if (null == gender) return
        this.gender = gender.ordinal.toShort()
    }

    fun setRecoveryCode() {
        val code = UUID.randomUUID().toString()
        recoveryCode = code
        recoveryCodeExpireTime = Timestamp(
            currentTimeMillis() + TimeUnit.SECONDS.toMillis(RECOVERY_CODE_EXPIRY_SECONDS)
        )
    }

    fun resetRecoveryCode() {
        recoveryCode?.let { recoveryCode = null }
        recoveryCodeExpireTime?.let { recoveryCodeExpireTime = null }
    }

    companion object {
        private const val RECOVERY_CODE_EXPIRY_SECONDS = 60L

        fun of(userModel: UserModel): User {
            val user = User()
            user.name = userModel.name
            user.email = userModel.email
            user.birthday = Timestamp(userModel.birthday.time)
            user.setGender(userModel.gender)
            user.password = passwordEncoder.encode(userModel.password)
            user.registerDate = Timestamp(currentTimeMillis())
            return user
        }
    }

    override fun toString(): String {
        return "User(id=$id, name=$name, email=$email, birthday=$birthday, " +
            "gender=${getGender()}, registerDate=$registerDate)"
    }
}
