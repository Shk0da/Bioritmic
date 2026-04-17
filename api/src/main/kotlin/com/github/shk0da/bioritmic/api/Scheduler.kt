package com.github.shk0da.bioritmic.api

import com.github.shk0da.bioritmic.api.configuration.DataSourceConfiguration.Companion.transactionManager
import io.r2dbc.spi.ConnectionFactory
import kotlinx.coroutines.reactive.awaitFirst
import kotlinx.coroutines.runBlocking
import org.infinispan.Cache
import org.slf4j.LoggerFactory
import org.springframework.r2dbc.core.DatabaseClient
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.lang.System.currentTimeMillis
import java.sql.Timestamp
import java.util.concurrent.TimeUnit

@Component
@EnableScheduling
class Scheduler(
    val connectionFactory: ConnectionFactory,
    val schedulerLockCache: Cache<String, Boolean>
) {

    private val log = LoggerFactory.getLogger(Scheduler::class.java)
    private val databaseClient: DatabaseClient by lazy { DatabaseClient.create(connectionFactory) }

    private val twoHoursInMillis = TimeUnit.HOURS.toMillis(2)
    private val yearInMillis = TimeUnit.DAYS.toMillis(365)

    @Scheduled(cron = "0 0 */1 * * ?")
    @Transactional(propagation = Propagation.REQUIRES_NEW, transactionManager = transactionManager)
    fun fireCleanOldGisData() {
        wrapWithLock("fireCleanOldGisData") {
            runBlocking {
                databaseClient
                    .sql("delete from gis_data where timestamp <= :timestamp")
                    .bind("timestamp", Timestamp(currentTimeMillis() - twoHoursInMillis))
                    .fetch()
                    .rowsUpdated()
                    .awaitFirst()
            }
        }
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional(propagation = Propagation.REQUIRES_NEW, transactionManager = transactionManager)
    fun fireCleanOldUsers() {
        wrapWithLock("fireCleanOldUsers") {
            runBlocking {
                databaseClient
                    .sql(
                        "delete from users where id in " +
                            "(select u.id from users u " +
                            "left join authorizations a on u.id = a.user_id " +
                            "where u.register_date < :timestamp and a.expire_time < :timestamp)"
                    )
                    .bind("timestamp", Timestamp(currentTimeMillis() - yearInMillis))
                    .fetch()
                    .rowsUpdated()
                    .awaitFirst()
            }
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
