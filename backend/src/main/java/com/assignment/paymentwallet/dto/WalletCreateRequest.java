package com.assignment.paymentwallet.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request body for POST /api/v1/wallets - a setup/demo convenience endpoint that lets
 * the dashboard (or a reviewer) create a funded wallet without touching the database
 * directly. Not part of the assignment's core idempotency/concurrency requirements.
 */
public record WalletCreateRequest(
    @NotNull(message = "userId is required")
    UUID userId,

    @NotNull(message = "initialBalance is required")
    @DecimalMin(value = "0.0", message = "initialBalance cannot be negative")
    @DecimalMax(value = "10000000.00", message = "initialBalance exceeds the maximum allowed amount (10,000,000.00)")
    BigDecimal initialBalance
) {
}
