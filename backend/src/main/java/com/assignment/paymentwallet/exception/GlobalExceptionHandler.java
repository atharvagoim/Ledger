package com.assignment.paymentwallet.exception;

import com.assignment.paymentwallet.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Centralized exception handling. Every error response returned by this API goes
 * through here and comes out as an {@link ErrorResponse} - no stack traces, no
 * internal exception messages leaking to the client.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DuplicateTransactionException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateTransaction(
        DuplicateTransactionException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "DUPLICATE_TRANSACTION", ex.getMessage(), request);
    }

    /** Same transactionId reused with a different userId/amount/type - a genuine conflict, not a safe retry. */
    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ErrorResponse> handleIdempotencyConflict(
        IdempotencyConflictException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_CONFLICT", ex.getMessage(), request);
    }

    @ExceptionHandler(WalletNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleWalletNotFound(
        WalletNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "WALLET_NOT_FOUND", ex.getMessage(), request);
    }

    @ExceptionHandler(WalletAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleWalletAlreadyExists(
        WalletAlreadyExistsException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, "WALLET_ALREADY_EXISTS", ex.getMessage(), request);
    }

    /** Jakarta Bean Validation failures on @Valid request bodies (e.g. negative amount). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
        MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    /** Malformed JSON, including a transactionId/userId string that isn't a valid UUID. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(
        HttpMessageNotReadableException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST",
            "Request body is missing or contains an invalid field (e.g. a malformed UUID).", request);
    }

    /** Last line of defense. Logs the real cause server-side; client sees a generic message. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error handling {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
            "An unexpected error occurred.", request);
    }

    private ResponseEntity<ErrorResponse> build(
        HttpStatus status, String error, String message, HttpServletRequest request) {
        ErrorResponse body = ErrorResponse.of(status.value(), error, message, request.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
