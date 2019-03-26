package com.github.shk0da.bioritmic.service;

import com.github.shk0da.bioritmic.domain.Authority;
import com.github.shk0da.bioritmic.domain.User;
import com.github.shk0da.bioritmic.repository.AuthorityRepository;
import com.github.shk0da.bioritmic.repository.UserRepository;
import com.github.shk0da.bioritmic.security.AuthoritiesConstants;
import com.github.shk0da.bioritmic.util.RepositoryUtils;
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.cache.Cache;
import java.util.Optional;

@Slf4j
@Service
@AllArgsConstructor
public class UserService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final AuthorityRepository authorityRepository;
    private final Cache<Long, User> userCache;

    public User getById(Long id) {
        User user = userCache.get(id);
        if (user == null) {
            user = userRepository.findById(id).orElse(null);
            if (user != null) {
                userCache.put(user.getId(), user);
            }
        }
        return user;
    }

    public User create(User user) {
        Optional<Authority> authority = authorityRepository.findByName(AuthoritiesConstants.USER);
        authority.ifPresent(it -> user.setAuthorities(Sets.newHashSet(it)));
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActivated(true);
        User createdUser = save(user);
        log.debug("Create user {} successfully!", createdUser.getLogin());
        return createdUser;
    }

    public User save(User user) {
        User savedUser = RepositoryUtils.save(user, userRepository);
        userCache.put(savedUser.getId(), savedUser);
        return savedUser;
    }
}
