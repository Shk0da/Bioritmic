package com.github.shk0da.bioritmic.controller.rest.v1;

import com.github.shk0da.bioritmic.controller.rest.ApiRoutes;
import com.github.shk0da.bioritmic.security.AuthoritiesConstants;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@AllArgsConstructor
@RequestMapping(ApiRoutes.API_VERSION_1 + "/media")
@Secured({AuthoritiesConstants.ADMIN, AuthoritiesConstants.USER})
public class MediaController {
}
