package com.github.shk0da.bioritmic.util;

import com.github.shk0da.bioritmic.exception.BioritmicException;
import com.google.common.collect.Maps;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.postgresql.util.PSQLException;
import org.postgresql.util.ServerErrorMessage;
import org.springframework.data.repository.CrudRepository;

import javax.validation.ConstraintViolationException;
import java.util.Map;

@UtilityClass
public class RepositoryUtils {

    public static <S> S save(S entity, CrudRepository crudRepository) throws ConstraintViolationException {
        try {
            return (S) crudRepository.save(entity);
        } catch (Exception ex) {
            if (ex.getCause() != null && (ex.getCause() instanceof javax.validation.ConstraintViolationException
                    || ex.getCause().getCause() instanceof javax.validation.ConstraintViolationException)) {
                Map<String, String> parameters = Maps.newHashMap();
                ((javax.validation.ConstraintViolationException) (ex.getCause().getCause()))
                        .getConstraintViolations()
                        .forEach(constraintViolation ->
                                parameters.put(constraintViolation.getPropertyPath().toString(), constraintViolation.getMessage())
                        );
                String parameter = String.join(", ", parameters.keySet());
                String error = String.join("; ", parameters.values());
                throw new BioritmicException(parameter, error);
            }

            if (ex.getCause() instanceof org.hibernate.exception.ConstraintViolationException) {
                Throwable throwable = ExceptionUtils.getRootCause(ex.getCause());
                if (throwable instanceof PSQLException) {
                    ServerErrorMessage serverErrorMessage = ((PSQLException) throwable).getServerErrorMessage();
                    String parameter = serverErrorMessage.getConstraint();
                    String error = serverErrorMessage.getDetail();
                    throw new BioritmicException(parameter, error);
                }
                throw new BioritmicException(throwable.getMessage());
            }

            throw ex;
        }
    }
}
