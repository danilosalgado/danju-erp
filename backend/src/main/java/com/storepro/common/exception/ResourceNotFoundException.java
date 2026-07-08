package com.storepro.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String resource, String field, Object value) {
        super(
            String.format("%s não encontrado com %s: %s", resource, field, value),
            HttpStatus.NOT_FOUND,
            "RESOURCE_NOT_FOUND"
        );
    }

    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }
}
