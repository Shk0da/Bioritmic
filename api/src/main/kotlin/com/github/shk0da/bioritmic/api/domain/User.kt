package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
import java.sql.Timestamp
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

    @Column(name = "recovery_code")
    @org.springframework.data.relational.core.mapping.Column("recovery_code")
    var recoveryCode: String? = null

    @Column(name = "recovery_code_expire_time")
    @org.springframework.data.relational.core.mapping.Column("recovery_code_expire_time")
    var recoveryCodeExpireTime: Timestamp? = null

    @JoinColumn(name = "id", referencedColumnName = "id")
    @OneToOne(cascade = [CascadeType.ALL], fetch = FetchType.LAZY, optional = true)
    var userSettings: UserSettings? = null

    companion object {
        fun of(userModel: UserModel): User {
            val user = User()
            user.name = userModel.name
            user.email = userModel.email
            user.birthday = Timestamp(userModel.birthday.time)
            user.password = passwordEncoder.encode(userModel.password)
            return user
        }
    }

    override fun toString(): String {
        return "User(id=$id, name=$name, email=$email, birthday=$birthday)"
    }
}
