package com.assignment.paymentwallet.exception;

import java.util.UUID;

/**
 * Thrown when a transactionId has already been claimed by another (committed or
 * currently in-flight) request. Triggered by the database UNIQUE constraint on
 * {@code transactions.transaction_id}, not by an application-level existence check -
 * see {@code TransactionProcessingService} for why that distinction matters.
 */
public class DuplicateTransactionException extends RuntimeException {

    public DuplicateTransactionException(UUID transactionId) {
        super("Transaction " + transactionId + " has already been processed.");
    }
}
