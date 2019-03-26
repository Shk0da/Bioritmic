package com.github.shk0da.bioritmic.repository;

import com.github.shk0da.bioritmic.domain.Authority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuthorityRepository extends JpaRepository<Authority, String> {

    Optional<Authority> findByName(String name);
}