package com.assignment.paymentwallet.dto;

import com.assignment.paymentwallet.entity.Transaction;
import com.assignment.paymentwallet.entity.TransactionStatus;
import com.assignment.paymentwallet.entity.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Response body for a successfully *processed* transaction attempt.
 *
 * <p>"Processed" includes the insufficient-funds outcome - the request was validly
 * handled, it just didn't result in a debit. Duplicate transactionId attempts never
 * reach this DTO; they short-circuit to {@link ErrorResponse} with 409 instead.
 */
public record TransactionResponse(
    UUID transactionId,
    UUID userId,
    BigDecimal amount,
    TransactionType type,
    TransactionStatus status,
    BigDecimal walletBalanceAfter,
    Instant processedAt
) {
    public static TransactionResponse from(Transaction transaction, BigDecimal walletBalanceAfter) {
        return new TransactionResponse(
            transaction.getTransactionId(),
            transaction.getUserId(),
            transaction.getAmount(),
            transaction.getType(),
            transaction.getStatus(),
            walletBalanceAfter,
            transaction.getUpdatedAt()
        );
    }
}
