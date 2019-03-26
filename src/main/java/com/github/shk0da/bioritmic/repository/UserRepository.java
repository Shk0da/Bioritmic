package com.github.shk0da.bioritmic.repository;


import com.github.shk0da.bioritmic.config.ignite.IgniteCacheName;
import com.github.shk0da.bioritmic.domain.User;
import org.apache.ignite.springdata.repository.IgniteRepository;
import org.apache.ignite.springdata.repository.config.RepositoryConfig;

@RepositoryConfig(cacheName = IgniteCacheName.userCache)
public interface UserRepository extends IgniteRepository<User, Long> {
}
