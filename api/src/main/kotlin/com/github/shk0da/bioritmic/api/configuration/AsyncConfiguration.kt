package com.github.shk0da.bioritmic.api.configuration

import com.google.common.util.concurrent.ThreadFactoryBuilder
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.core.task.TaskExecutor
import org.springframework.scheduling.TaskScheduler
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.concurrent.ConcurrentTaskExecutor
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler
import java.lang.System.setProperty
import java.util.concurrent.Executors
import kotlin.math.max

@EnableAsync
@Configuration
class AsyncConfiguration {

    companion object {

        private val log = LoggerFactory.getLogger(AsyncConfiguration::class.java)

        private val AVAILABLE_PROCESSORS = max(4, Runtime.getRuntime().availableProcessors())
        private val AVAILABLE_TASK_THREADS = max(16, AVAILABLE_PROCESSORS * 4)
        private val AVAILABLE_NETTY_WORKERS = AVAILABLE_TASK_THREADS * 2

        init {
            setProperty("reactor.ipc.netty.workerCount", AVAILABLE_NETTY_WORKERS.toString())
            log.info("Available processors: {}", AVAILABLE_PROCESSORS)
            log.info("Available task threads: {}", AVAILABLE_TASK_THREADS)
            log.info("Available netty workerCount: {}", AVAILABLE_NETTY_WORKERS)
        }
    }

    @Primary
    @Bean("taskExecutor")
    fun taskExecutor(): TaskExecutor {
        val taskExecutor = ConcurrentTaskExecutor()
        taskExecutor.setConcurrentExecutor(Executors.newWorkStealingPool(AVAILABLE_TASK_THREADS))
        return taskExecutor
    }

    @Bean("cachedThreadPoolExecutor")
    fun cachedThreadPoolExecutor(): TaskExecutor {
        val taskExecutor = ConcurrentTaskExecutor()
        taskExecutor.setConcurrentExecutor(Executors.newCachedThreadPool(
                ThreadFactoryBuilder().setNameFormat("main-task-executor-%d").build()
        ))
        return taskExecutor
    }

    @Bean("taskScheduler")
    fun taskScheduler(): TaskScheduler {
        val scheduler = ThreadPoolTaskScheduler()
        scheduler.poolSize = AVAILABLE_TASK_THREADS
        scheduler.setErrorHandler { throwable: Throwable? -> log.error("Scheduled task error", throwable) }
        scheduler.setThreadNamePrefix("main-task-scheduler-")
        return scheduler
    }
}