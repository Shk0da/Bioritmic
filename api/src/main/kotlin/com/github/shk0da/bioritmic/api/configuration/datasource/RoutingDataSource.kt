package com.github.shk0da.bioritmic.api.configuration.datasource

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource

class RoutingDataSource : AbstractRoutingDataSource() {

    enum class Route {
        MASTER, SLAVE
    }

    companion object {

        private val ctx = ThreadLocal<Route>()

        @JvmStatic
        fun clearSlaveRoute() {
            ctx.remove()
        }

        @JvmStatic
        fun setSlaveRoute() {
            ctx.set(Route.SLAVE)
        }
    }

    override fun determineCurrentLookupKey(): Any? {
        return ctx.get()
    }
}
