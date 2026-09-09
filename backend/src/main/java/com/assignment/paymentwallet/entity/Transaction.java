package com.assignment.paymentwallet.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A record of one processing attempt for a given client-supplied {@code transactionId}.
 *
 * <p>The UNIQUE constraint on {@code transaction_id} is the backbone of idempotency:
 * it is what turns "check if it exists, then insert" from a racy two-step operation
 * into an atomic, database-enforced guarantee. Two concurrent requests carrying the
 * same transactionId can both attempt the insert, but the database allows only one
 * to succeed - the other fails fast with a constraint violation, which the service
 * layer translates into a 409 Conflict without ever touching the wallet balance.
 *
 * <p>A row is written here even when processing fails due to insufficient funds, so
 * this table is also a complete audit trail of every attempt, not just successes.
 */
@Entity
@Table(
    name = "transactions",
    uniqueConstraints = @UniqueConstraint(name = "uk_transaction_transaction_id", columnNames = "transaction_id")
)
@EntityListeners(AuditingEntityListener.class)
public class Transaction {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "transaction_id", nullable = false, updatable = false)
    private UUID transactionId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "amount", nullable = false, updatable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, updatable = false, length = 20)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private TransactionStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Transaction() {
        // required by JPA
    }

    public Transaction(UUID id, UUID transactionId, UUID userId, BigDecimal amount,
                        TransactionType type, TransactionStatus status) {
        this.id = id;
        this.transactionId = transactionId;
        this.userId = userId;
        this.amount = amount;
        this.type = type;
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTransactionId() {
        return transactionId;
    }

    public UUID getUserId() {
        return userId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public TransactionType getType() {
        return type;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
