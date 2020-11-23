package com.github.shk0da.bioritmic.api

import com.github.shk0da.bioritmic.api.configuration.datasource.JpaConfiguration.Companion.jpaTransactionManager
import org.infinispan.Cache
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.lang.System.currentTimeMillis
import java.sql.Timestamp
import java.util.concurrent.TimeUnit
import javax.persistence.EntityManager

@Component
@EnableScheduling
class Scheduler(val entityManager: EntityManager,
                val schedulerLockCache: Cache<String, Boolean>) {

    private val log = LoggerFactory.getLogger(Scheduler::class.java)

    private val twoHoursInMillis = TimeUnit.HOURS.toMillis(2)
    private val yearInMillis = TimeUnit.DAYS.toMillis(365)

    @Scheduled(cron = "0 0 */1 * * ?")
    @Transactional(propagation = Propagation.REQUIRES_NEW, transactionManager = jpaTransactionManager)
    fun fireCleanOldGisData() {
        wrapWithLock("fireCleanOldGisData") {
            entityManager.joinTransaction()
            entityManager
                    .createQuery("delete from GisData where timestamp <= :timestamp")
                    .setParameter("timestamp", Timestamp(currentTimeMillis() - twoHoursInMillis))
                    .executeUpdate()
            entityManager.flush()
        }
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional(propagation = Propagation.REQUIRES_NEW, transactionManager = jpaTransactionManager)
    fun fireCleanOldUsers() {
        wrapWithLock("fireCleanOldUsers") {
            entityManager.joinTransaction()
            entityManager
                    .createQuery("delete from User where id in " +
                            "(select u.id from User u " +
                            "left join Auth a on u.id = a.userId " +
                            "where u.registerDate < :timestamp and a.expireTime < :timestamp)")
                    .setParameter("timestamp", Timestamp(currentTimeMillis() - yearInMillis))
                    .executeUpdate()
            entityManager.flush()
        }
    }

    private fun wrapWithLock(fireLockKey: String, runnable: Runnable) {
        val isFiring = schedulerLockCache.getOrDefault(fireLockKey, false)
        if (isFiring) return
        try {
            log.info("Start $fireLockKey")
            schedulerLockCache[fireLockKey] = true
            runnable.run()
        } finally {
            schedulerLockCache[fireLockKey] = false
            log.info("Finish $fireLockKey")
        }
    }
}