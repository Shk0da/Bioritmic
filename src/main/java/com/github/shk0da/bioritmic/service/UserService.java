package com.github.shk0da.bioritmic.service;

import com.github.shk0da.bioritmic.domain.User;
import com.github.shk0da.bioritmic.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.cache.Cache;

@Slf4j
@Service
@AllArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final Cache<Long, User> userCache;

    public User getById(Long id) {
        User user = userCache.get(id);
        if (user == null) {
            user = userRepository.findById(id).orElse(null);
        }
        return user;
    }

    public User save(User user) {
        userCache.put(user.getId(), user);
        return userRepository.save(user);
    }
}
