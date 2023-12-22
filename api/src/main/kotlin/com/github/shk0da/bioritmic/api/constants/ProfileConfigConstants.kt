package com.github.shk0da.bioritmic.api.constants

import org.springframework.boot.autoconfigure.condition.ConditionOutcome
import org.springframework.boot.autoconfigure.condition.SpringBootCondition
import org.springframework.context.annotation.ConditionContext
import org.springframework.core.type.AnnotatedTypeMetadata
import java.util.Arrays

interface ProfileConfigConstants {

    companion object {
        const val SPRING_PROFILE_PRODUCTION = "production"
        const val SPRING_PROFILE_DEVELOPMENT = "develop"
        const val SPRING_PROFILE_SWAGGER = "swagger"
        const val SPRING_PROFILE_TEST = "test"
        const val SPRING_PROFILE_K8S = "k8s"
        const val SPRING_PROFILE_PG_EMBEDDED = "pg_embedded"
    }

    class DefaultDataSourceProfileCondition : SpringBootCondition() {
        override fun getMatchOutcome(context: ConditionContext, metadata: AnnotatedTypeMetadata): ConditionOutcome {
            return if (Arrays.stream(context.environment.activeProfiles).noneMatch { o: String? -> EMBEDDED_LIST.contains(o) })
                ConditionOutcome.match()
            else
                ConditionOutcome.noMatch("Is embedded DataSource profile")
        }

        companion object {
            private val EMBEDDED_LIST: List<String> = arrayListOf(SPRING_PROFILE_PG_EMBEDDED)
        }
    }
}