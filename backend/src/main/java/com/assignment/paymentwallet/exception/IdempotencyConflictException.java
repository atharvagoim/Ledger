package com.assignment.paymentwallet.exception;

import java.util.UUID;

/**
 * Thrown when a {@code transactionId} that was already claimed by a prior request is
 * reused with a <b>different</b> payload (a different userId, amount, and/or type).
 *
 * <p>This is deliberately distinct from {@link DuplicateTransactionException}: an
 * idempotency key represents one specific operation. Same key + same payload is a
 * safe retry (see {@code TransactionProcessingService#resolveDuplicate}, which
 * returns the original result instead of throwing). Same key + a different payload
 * is a genuine client error - the caller is asking the same transactionId to mean
 * two different financial operations, which this system refuses to allow.
 */
public class IdempotencyConflictException extends RuntimeException {

    public IdempotencyConflictException(UUID transactionId) {
        super("Transaction " + transactionId + " already exists with a different request payload "
            + "(userId, amount, or type does not match the original request). "
            + "The same transactionId must always represent the same operation - use a new transactionId "
            + "for a different payload.");
    }
}
