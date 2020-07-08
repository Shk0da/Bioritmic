package com.github.shk0da.bioritmic.api.persistence

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource

class RoutingDataSource : AbstractRoutingDataSource() {

    enum class Route {
        PRIMARY, REPLICA
    }

    override fun determineCurrentLookupKey(): Any? {
        return ctx.get()
    }

    companion object {
        private val ctx = ThreadLocal<Route>()
        @JvmStatic
        fun clearReplicaRoute() {
            ctx.remove()
        }

        @JvmStatic
        fun setReplicaRoute() {
            ctx.set(Route.REPLICA)
        }
    }
}