package com.github.shk0da.bioritmic.controller.rest.v1;

import com.github.shk0da.bioritmic.controller.rest.ApiRoutes;
import com.github.shk0da.bioritmic.domain.User;
import com.github.shk0da.bioritmic.security.AuthoritiesConstants;
import com.github.shk0da.bioritmic.service.UserService;
import com.github.shk0da.bioritmic.util.ResponseUtils;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;
import java.net.URI;
import java.net.URISyntaxException;

@Slf4j
@RestController
@AllArgsConstructor
@RequestMapping(ApiRoutes.API_VERSION_1 + "/users")
@Secured({AuthoritiesConstants.ADMIN, AuthoritiesConstants.USER})
public class UserController {

    private final UserService userService;

    @GetMapping(value = "/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<User> getByUserId(@PathVariable Long id) {
        log.debug("#getByUserId({})", id);
        return ResponseUtils.response(userService.getById(id));
    }

    @PostMapping(value = "/")
    public ResponseEntity<User> saveUser(@Valid @RequestBody User user) throws URISyntaxException {
        log.debug("#saveUser({})", user);
        User createdUser = userService.create(user);
        return ResponseEntity
                .created(new URI(ApiRoutes.API_VERSION_1 + "/users/" + createdUser.getId()))
                .body(createdUser);
    }
}
