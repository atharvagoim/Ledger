package com.assignment.paymentwallet.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.Check;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A user's wallet balance.
 *
 * <p>One wallet per user (enforced by the unique constraint on {@code user_id}).
 * Balance is a {@link BigDecimal} - never a double/float - because money must not
 * suffer floating-point rounding error.
 *
 * <p>Non-negative balance is enforced at <b>three</b> independent layers, from
 * outermost to innermost:
 * <ol>
 *   <li>{@code TransactionProcessingService} checks {@code balance >= amount} before
 *       ever attempting a debit - this is what produces the friendly 422
 *       {@code FAILED_INSUFFICIENT_FUNDS} response instead of a raw SQL error.</li>
 *   <li>{@code @Lock(PESSIMISTIC_WRITE)} on the wallet row (see
 *       {@code WalletRepository#findByUserIdForUpdate}) makes that check-then-debit
 *       safe under concurrency, so the balance it reads is never stale.</li>
 *   <li>The {@code @Check(constraints = "balance >= 0")} below is the last line of
 *       defense: a real database-level CHECK constraint that would reject a negative
 *       balance even if a future code change (or a direct SQL statement) bypassed the
 *       two layers above. It is not the primary mechanism - by the time a write would
 *       violate it, the application-level check has already failed - but it is a
 *       genuine, independently-enforced guarantee, not just documentation.</li>
 * </ol>
 */
@Entity
@Table(
    name = "wallets",
    uniqueConstraints = @UniqueConstraint(name = "uk_wallet_user_id", columnNames = "user_id")
)
@Check(constraints = "balance >= 0")
@EntityListeners(AuditingEntityListener.class)
public class Wallet {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    /**
     * Scale 4 gives headroom beyond typical 2-decimal currency amounts (useful if
     * fractional/foreign-currency amounts are ever introduced) without ever using
     * floating point.
     */
    @Column(name = "balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal balance;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Wallet() {
        // required by JPA
    }

    public Wallet(UUID id, UUID userId, BigDecimal balance) {
        this.id = id;
        this.userId = userId;
        this.balance = balance;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
