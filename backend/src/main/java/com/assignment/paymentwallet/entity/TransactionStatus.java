package com.assignment.paymentwallet.entity;

/**
 * The outcome of processing a transaction.
 *
 * <p>A transaction row is written even for rejected attempts (insufficient funds),
 * so the table doubles as an audit trail of every attempt, not just successful ones.
 */
public enum TransactionStatus {
    SUCCESS,
    FAILED_INSUFFICIENT_FUNDS
}
