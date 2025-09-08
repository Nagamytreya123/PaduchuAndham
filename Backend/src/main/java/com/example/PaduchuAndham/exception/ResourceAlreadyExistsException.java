package com.example.PaduchuAndham.exception;

/**
 * Thrown when attempting to create a resource that already exists (e.g. registering a user with an email already taken).
 */
public class ResourceAlreadyExistsException extends RuntimeException {
    public ResourceAlreadyExistsException() {
        super();
    }

    public ResourceAlreadyExistsException(String message) {
        super(message);
    }

    public ResourceAlreadyExistsException(String message, Throwable cause) {
        super(message, cause);
    }
}
