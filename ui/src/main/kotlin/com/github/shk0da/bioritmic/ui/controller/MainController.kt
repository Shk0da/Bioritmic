package com.github.shk0da.bioritmic.ui.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class MainController {

    @GetMapping("/")
    fun index(): String {
        return "index"
    }
}