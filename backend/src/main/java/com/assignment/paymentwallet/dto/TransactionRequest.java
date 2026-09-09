package com.assignment.paymentwallet.dto;

import com.assignment.paymentwallet.entity.TransactionType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request body for POST /api/v1/transactions/process.
 *
 * <p>A malformed UUID string in the incoming JSON never reaches these fields at all -
 * Jackson rejects it while deserializing, and {@code GlobalExceptionHandler} turns
 * that into a clean 400 response before validation even runs.
 */
public record TransactionRequest(

    @NotNull(message = "transactionId is required")
    UUID transactionId,

    @NotNull(message = "userId is required")
    UUID userId,

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "amount must be positive")
    @DecimalMax(value = "10000000.00", message = "amount exceeds the maximum allowed transaction amount (10,000,000.00)")
    @Digits(integer = 15, fraction = 4, message = "amount has too many decimal places")
    BigDecimal amount,

    @NotNull(message = "type is required")
    TransactionType type
) {
}
