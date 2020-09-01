package com.github.shk0da.bioritmic.api.provider

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Configuration
import java.util.function.Supplier

@Configuration
class ApplicationContextProvider @Autowired constructor(applicationContext: ApplicationContext?) {

    init {
        Companion.applicationContext = applicationContext
    }

    companion object {
        var applicationContext: ApplicationContext? = null
            private set

        fun <T> getBean(requiredType: Class<T>): T {
            return applicationContext!!.getBean(requiredType)
        }

        fun <T> getBean(name: String?, requiredType: Class<T>): T {
            return applicationContext!!.getBean(name!!, requiredType)
        }

        fun <T> getBeanLazy(requiredType: Class<T>): Supplier<T> {
            return lazily(Supplier { getBean(requiredType) })
        }

        private fun <Z> lazily(supplier: Supplier<Z>): Supplier<Z> {
            return object : Supplier<Z> {
                var value: Z? = null
                override fun get(): Z {
                    if (value == null) {
                        value = supplier.get()
                    }
                    return value!!
                }
            }
        }
    }
}