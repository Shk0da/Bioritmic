package com.github.shk0da.bioritmic.api.aop.datasource;

import com.github.shk0da.bioritmic.api.configuration.datasource.RoutingDataSource;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Aspect
@Component
@Order(0)
public class ReadOnlyRouteInterceptor {

    private static final Logger log = LoggerFactory.getLogger(ReadOnlyRouteInterceptor.class);

    @Around("@annotation(transactional)")
    public Object proceed(ProceedingJoinPoint proceedingJoinPoint, Transactional transactional) throws Throwable {
        try {
            if (transactional.readOnly()) {
                RoutingDataSource.setSlaveRoute();
                log.trace("Routing database call to the read replica");
            }
            return proceedingJoinPoint.proceed();
        } finally {
            RoutingDataSource.clearSlaveRoute();
        }
    }
}