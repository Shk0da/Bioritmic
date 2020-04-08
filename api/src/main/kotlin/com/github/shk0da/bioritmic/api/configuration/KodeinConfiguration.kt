package com.github.shk0da.bioritmic.api.configuration

import com.github.shk0da.bioritmic.api.service.ExampleService
import org.kodein.di.Kodein
import org.kodein.di.generic.bind
import org.kodein.di.generic.singleton

class KodeinConfiguration {

    private val exampleService = Kodein.Module("exampleService") {
        bind() from singleton { ExampleService() }
    }

    internal val kodein = Kodein {
        import(exampleService)
    }
}