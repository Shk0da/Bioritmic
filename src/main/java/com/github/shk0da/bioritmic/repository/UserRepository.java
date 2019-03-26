package com.github.shk0da.bioritmic.repository;

import com.github.shk0da.bioritmic.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
}
