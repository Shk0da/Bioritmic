package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.search.Gender
import com.github.shk0da.bioritmic.api.model.user.UserModel
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import java.sql.Timestamp
import java.util.*
import java.util.concurrent.TimeUnit
import javax.persistence.*

@Entity
@Table(name = "users")
@org.springframework.data.relational.core.mapping.Table("users")
class User {

    @Id
    @org.springframework.data.annotation.Id
    @org.springframework.data.relational.core.mapping.Column("id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var name: String? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var email: String? = null

    @Column
    @org.springframework.data.relational.core.mapping.Column
    var password: String? = null

    @Column(name = "birthday")
    @org.springframework.data.relational.core.mapping.Column("birthday")
    var birthday: Timestamp? = null

    @Column(name = "gender")
    @org.springframework.data.relational.core.mapping.Column
    var gender: Short? = null

    @Column(name = "recovery_code")
    @org.springframework.data.relational.core.mapping.Column("recovery_code")
    var recoveryCode: String? = null

    @Column(name = "recovery_code_expire_time")
    @org.springframework.data.relational.core.mapping.Column("recovery_code_expire_time")
    var recoveryCodeExpireTime: Timestamp? = null

    @Transient
    @org.springframework.data.annotation.Transient
    var userSettings: UserSettings? = null

    fun getGender(): Gender? {
        if (null == this.gender || Gender.values().size < this.gender as Int) {
            return null
        }
        return Gender.values()[this.gender as Int]
    }

    fun setGender(gender: Gender?) {
        if (null == gender) return
        this.gender = gender.ordinal as Short
    }

    fun setRecoveryCode() {
        val code = UUID.randomUUID().toString()
        recoveryCode = code
        recoveryCodeExpireTime = Timestamp(System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(60))
    }

    fun resetRecoveryCode() {
        recoveryCode?.let { recoveryCode = null }
        recoveryCodeExpireTime?.let { recoveryCodeExpireTime = null }
    }

    companion object {
        fun of(userModel: UserModel): User {
            val user = User()
            user.name = userModel.name
            user.email = userModel.email
            user.birthday = Timestamp(userModel.birthday.time)
            user.setGender(userModel.gender)
            user.password = passwordEncoder.encode(userModel.password)
            return user
        }
    }

    override fun toString(): String {
        return "User(id=$id, name=$name, email=$email, birthday=$birthday, gender=${getGender()})"
    }
}
