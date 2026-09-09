package com.assignment.paymentwallet.dto;

import java.time.Instant;

/**
 * Uniform error body returned by {@code GlobalExceptionHandler} for every failure case.
 * Never contains a stack trace or any internal implementation detail.
 */
public record ErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path
) {
    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(Instant.now(), status, error, message, path);
    }
}
