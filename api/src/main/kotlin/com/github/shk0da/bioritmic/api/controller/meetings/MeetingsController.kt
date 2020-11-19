package com.github.shk0da.bioritmic.api.controller.meetings

import com.github.shk0da.bioritmic.api.controller.ApiRoutes
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(ApiRoutes.API_PATH + ApiRoutes.VERSION_1 + "/meetings")
class MeetingsController