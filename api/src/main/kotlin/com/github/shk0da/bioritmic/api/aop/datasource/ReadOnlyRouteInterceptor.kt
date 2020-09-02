package com.github.shk0da.bioritmic.api.aop.datasource

import com.github.shk0da.bioritmic.api.configuration.datasource.RoutingDataSource.Companion.clearSlaveRoute
import com.github.shk0da.bioritmic.api.configuration.datasource.RoutingDataSource.Companion.setSlaveRoute
import org.aspectj.lang.ProceedingJoinPoint
import org.aspectj.lang.annotation.Around
import org.aspectj.lang.annotation.Aspect
import org.slf4j.LoggerFactory
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Aspect
@Component
@Order(0)
class ReadOnlyRouteInterceptor {

    private val log = LoggerFactory.getLogger(ReadOnlyRouteInterceptor::class.java)

    @Throws(Throwable::class)
    @Around("@annotation(transactional)")
    fun proceed(proceedingJoinPoint: ProceedingJoinPoint, transactional: Transactional): Any {
        return try {
            if (transactional.readOnly) {
                setSlaveRoute()
                log.trace("Routing database call to the read replica")
            }
            proceedingJoinPoint.proceed()
        } finally {
            clearSlaveRoute()
        }
    }
}