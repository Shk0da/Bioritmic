package com.github.shk0da.bioritmic.util;

import lombok.experimental.UtilityClass;

import javax.validation.ConstraintViolation;
import javax.validation.ConstraintViolationException;

@UtilityClass
public class ConstraintViolationUtils {

    public static String getMessageViolationException(ConstraintViolationException ex) {
        StringBuilder sb = new StringBuilder();

        for (ConstraintViolation<?> c : ex.getConstraintViolations()) {
            if (c.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName().equals("Email")) {
                sb.append("Does not match pattern. ");
            }
            if (c.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName().equals("Max")
                    || c.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName().equals("Min")
                    || c.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName().equals("Size")) {
                sb.append("The value of the attribute is out of range. ");
            }
            if (c.getConstraintDescriptor().getAnnotation().annotationType().getSimpleName().equals("NotNull")) {
                sb.append("Required parameter not set. ");
            }

            sb.append("Check ");
            sb.append(c.getPropertyPath());
        }

        return sb.toString();
    }

}