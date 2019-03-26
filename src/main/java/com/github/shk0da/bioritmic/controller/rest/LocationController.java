package com.github.shk0da.bioritmic.controller.rest;

import com.github.shk0da.bioritmic.domain.Location;
import com.github.shk0da.bioritmic.security.AuthoritiesConstants;
import com.github.shk0da.bioritmic.service.LocationService;
import com.github.shk0da.bioritmic.util.ResponseUtils;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@AllArgsConstructor
@RequestMapping(ApiRoutes.API_VERSION_1_0 + "/location")
@Secured({AuthoritiesConstants.ADMIN, AuthoritiesConstants.USER})
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Location> getByUserId(@PathVariable Integer userId) throws Exception {
        log.debug("#getByUserId({})", userId);
        return ResponseUtils.response(null);
    }
}
