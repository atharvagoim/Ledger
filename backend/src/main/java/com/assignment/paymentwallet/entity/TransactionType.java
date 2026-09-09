package com.assignment.paymentwallet.entity;

/**
 * The kind of wallet movement a transaction represents.
 *
 * <p>Only DEBIT is exercised by the required processing flow, but CREDIT is included
 * so the model isn't artificially one-sided - a wallet processor that can only ever
 * subtract money is an incomplete domain model, even if this assignment's tests
 * focus on debits.
 */
public enum TransactionType {
    DEBIT,
    CREDIT
}
