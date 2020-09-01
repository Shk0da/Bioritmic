package com.github.shk0da.bioritmic.api.domain

import com.github.shk0da.bioritmic.api.model.UserModel
import com.github.shk0da.bioritmic.api.utils.CryptoUtils.passwordEncoder
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

    companion object {
        fun of(userModel: UserModel): User {
            val user = User()
            user.name = userModel.name
            user.email = userModel.email
            user.password = passwordEncoder.encode(userModel.password)
            return user
        }
    }
}
